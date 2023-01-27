import { ButtonStyle, ComponentType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	Collection,
	Message,
	SlashCommandBuilder,
	userMention
} from "discord.js";
import { ManualDeckSubmission, ManualParticipant, ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { send } from "../util/discord";
import { getLogger, Logger } from "../util/logger";
import {
	authenticateHost,
	autocompleteTournament,
	awaitDeckValidationButtons,
	generateDeckValidateButtons,
	tournamentOption
} from "./database";

export class OpenCommand extends AutocompletableCommand {
	#logger = getLogger("command:open");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("open")
			.setDescription("Open a tournament for registration.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		autocompleteTournament(interaction);
	}

	async collectRegisterMessages(
		messages: Collection<string, Message<boolean>>,
		player: ManualParticipant,
		buttonInteraction: ButtonInteraction,
		baseInteraction: ChatInputCommandInteraction,
		tournament: ManualTournament
	): Promise<void> {
		const message = messages.first();
		if (message) {
			const images = message.attachments.filter(a => a.contentType?.startsWith("image"));
			if (images.size < 1) {
				await message.reply(
					"You need to upload screenshots of your deck to register. Please click the button and try again."
				);
			}
			player.deck = new ManualDeckSubmission();
			player.deck.approved = false;
			player.deck.content = images.map(i => i.url).join("\n");
			player.deck.participant = player;
			player.deck.tournament = tournament;
			const friendCode = parseInt(message.content);
			if (!isNaN(friendCode) && friendCode.toString(10).length === 9) {
				player.friendCode = friendCode;
				// TODO: Edit player nickname with friend code
			}
			await player.deck.save();
			await player.save();

			let outMessage = `__**${userMention(buttonInteraction.user.id)}'s deck**__:`;
			outMessage += `\n${player.deck.content}`;

			const row = generateDeckValidateButtons();
			// channel *should* exist, but can be removed in the interim. if so, TOs have to check decks manually and that's on them :/
			if (tournament.privateChannel) {
				const response = await send(baseInteraction.client, tournament.privateChannel, {
					content: outMessage,
					components: [row]
				});
				// errors handled by internal callbacks
				awaitDeckValidationButtons(baseInteraction, response, tournament, this.logger, player.deck);
			}

			await message.reply(
				"Your deck has been submitted to the tournament hosts. Please wait for their approval."
			);
		}
	}

	async collectButtonInteraction(
		buttonInteraction: ButtonInteraction,
		baseInteraction: ChatInputCommandInteraction,
		tournament: ManualTournament
	): Promise<void> {
		if (tournament.participantLimit > 0 && tournament.participants?.length >= tournament.participantLimit) {
			await buttonInteraction.user.send("Sorry, the tournament is currently full!");
			return;
		}
		await buttonInteraction.user.send(
			"Please upload screenshots of your decklist to register.\nYou can also type in a Master Duel friend code.\n**Important**: Please do not delete your message! This can make your decklist invisible to tournament hosts, which they may interpret as cheating."
		);

		const player: ManualParticipant = new ManualParticipant();
		player.discordId = buttonInteraction.user.id;
		player.dropped = false;
		player.tournament = tournament;
		await player.save();
		tournament.participants.push(player);
		await tournament.save();

		// we just sent a DM so the DM channel will be created
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		buttonInteraction.user
			.dmChannel!.awaitMessages({ max: 1, time: 30000 })
			.then(m => this.collectRegisterMessages(m, player, buttonInteraction, baseInteraction, tournament))
			.catch(e => this.logger.error(e));
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		if (!tournament.publicChannel) {
			await interaction.reply({
				content: "This tournament has no public announcement channel to send the registration message.",
				ephemeral: true
			});
			return;
		}

		if (!tournament.privateChannel) {
			await interaction.reply({
				content: "This tournament has no private channel to accept deck submissions.",
				ephemeral: true
			});
			return;
		}

		const row = new ActionRowBuilder<ButtonBuilder>();
		const button = new ButtonBuilder()
			.setCustomId("registerButton")
			.setLabel("Click here to register!")
			.setStyle(ButtonStyle.Success);
		row.addComponents(button);

		const message = await send(interaction.client, tournament.publicChannel, {
			content: `__Registration for **${tournament.name}** is now open!__\nClick the button below to register, then upload screenshots of your decklist.\nA tournament host will then manually verify your deck.\nYou can also type in a Master Duel friend code in the same message.`,
			components: [row]
		});
		tournament.registerMessage = message.id;
		await tournament.save();
		// awaitMessageComponent only collects one response so we need to use the callback version
		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 604800 // one week. hopefully no cap? this needs to stay open long term.
		});

		collector.on("collect", i => this.collectButtonInteraction(i, interaction, tournament));
	}
}
