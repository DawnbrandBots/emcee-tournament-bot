import {
	ButtonStyle,
	ComponentType,
	RESTPostAPIApplicationCommandsJSONBody,
	TextInputStyle
} from "discord-api-types/v10";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	CacheType,
	channelMention,
	ChatInputCommandInteraction,
	Collection,
	Message,
	ModalBuilder,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	TextInputBuilder,
	userMention
} from "discord.js";
import { TournamentStatus } from "../database/interface";
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
		modalInteraction: ModalSubmitInteraction,
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
				// TODO: do we need to destroy the player entry here?
				return;
			}
			const deck = new ManualDeckSubmission();
			deck.approved = false;
			deck.content = images.map(i => i.url).join("\n");
			deck.participant = player;
			deck.tournament = tournament;
			await deck.save();

			let outMessage = `__**${userMention(modalInteraction.user.id)}'s deck**__:`;
			outMessage += `\n${deck.content}`;

			const row = generateDeckValidateButtons();
			// channel *should* exist, but can be removed in the interim. if so, TOs have to check decks manually and that's on them :/
			if (tournament.privateChannel) {
				const response = await send(baseInteraction.client, tournament.privateChannel, {
					content: outMessage,
					components: [row]
				});
				// errors handled by internal callbacks
				awaitDeckValidationButtons(baseInteraction, response, tournament, this.logger, deck);
			}

			await message.reply(
				"Your deck has been submitted to the tournament hosts. Please wait for their approval."
			);
		}
	}

	validateFriendCode(input: string): number | undefined {
		const friendCode = parseInt(input.replace(/[^\d]/g, ""));
		if (!isNaN(friendCode) && friendCode.toString(10).length === 9) {
			return friendCode;
		}
	}

	async collectModalInteraction(
		modalInteraction: ModalSubmitInteraction,
		baseInteraction: ChatInputCommandInteraction,
		tournament: ManualTournament
	): Promise<void> {
		const friendCodeString = modalInteraction.fields.getTextInputValue("acceptDeckLabel");
		const friendCode = this.validateFriendCode(friendCodeString);
		if (!friendCode) {
			if (tournament.requireFriendCode) {
				await modalInteraction.user.send(
					`This tournament requires a Master Duel friend code, and you did not enter a valid one! Please try again.`
				);
				return;
			}
			await modalInteraction.user.send(
				`You did not enter a valid Master Duel friend code. However, you can still register.`
			);
		}
		await modalInteraction.user.send(
			"Please upload screenshots of your decklist to register.\n**Important**: Please do not delete your message! This can make your decklist invisible to tournament hosts, which they may interpret as cheating."
		);

		const player: ManualParticipant = new ManualParticipant();
		player.discordId = modalInteraction.user.id;
		player.dropped = false;
		player.tournament = tournament;
		player.friendCode = friendCode;
		await player.save();

		// we just sent a DM so the DM channel will be created
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		modalInteraction.user
			.dmChannel!.awaitMessages({ max: 1, time: 30000 })
			.then(m => this.collectRegisterMessages(m, player, modalInteraction, baseInteraction, tournament))
			.catch(e => this.logger.error(e));
	}

	async collectButtonInteraction(
		buttonInteraction: ButtonInteraction,
		baseInteraction: ChatInputCommandInteraction,
		tournament: ManualTournament
	): Promise<void> {
		if (tournament.status !== TournamentStatus.PREPARING) {
			await buttonInteraction.user.send("Sorry, registration for the tournament has closed!");
			return;
		}
		if (tournament.participantLimit > 0 && tournament.participants?.length >= tournament.participantLimit) {
			await buttonInteraction.user.send("Sorry, the tournament is currently full!");
			return;
		}
		const modal = new ModalBuilder().setCustomId("registerModal").setTitle(`Register for ${tournament.name}`);
		const deckLabelInput = new TextInputBuilder()
			.setCustomId("friendCode")
			.setLabel("Master Duel Friend Code")
			.setStyle(TextInputStyle.Short)
			.setRequired(tournament.requireFriendCode);
		const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(deckLabelInput);
		modal.addComponents(actionRow);
		await buttonInteraction.showModal(modal);

		buttonInteraction
			.awaitModalSubmit({ componentType: ComponentType.TextInput, time: 15000 })
			.then(m => this.collectModalInteraction(m, baseInteraction, tournament))
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
			content: `__Registration for **${tournament.name}** is now open!__\nClick the button below to register, then follow the prompts.\nA tournament host will then manually verify your deck.`,
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

		await interaction.reply(
			`Registration for ${tournament.name} is now open in ${channelMention(
				tournament.publicChannel
			)}. Look for decks in ${channelMention(tournament.privateChannel)}.`
		);
	}
}
