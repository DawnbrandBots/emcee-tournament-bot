import { ButtonStyle, RESTPostAPIApplicationCommandsJSONBody, TextInputStyle } from "discord-api-types/v10";
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
	ModalMessageModalSubmitInteraction,
	ModalSubmitInteraction,
	SlashCommandBuilder,
	TextInputBuilder,
	userMention
} from "discord.js";
import { TournamentStatus } from "../database/interface";
import { ManualDeckSubmission, ManualParticipant, ManualTournament } from "../database/orm";
import { AutocompletableCommand, ButtonClickHandler, MessageModalSubmitHandler } from "../SlashCommand";
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
			.setStyle(ButtonStyle.Success)
			.setEmoji("✅");
		row.addComponents(button);

		const message = await send(interaction.client, tournament.publicChannel, {
			content: `__Registration for **${tournament.name}** is now open!__\nClick the button below to register, then follow the prompts.\nA tournament host will then manually verify your deck.`,
			components: [row]
		});
		tournament.registerMessage = message.id;
		await tournament.save();

		await interaction.reply(
			`Registration for ${tournament.name} is now open in ${channelMention(
				tournament.publicChannel
			)}. Look for decks in ${channelMention(tournament.privateChannel)}.`
		);
	}
}

async function registerParticipant(
	interaction: ButtonInteraction | ModalMessageModalSubmitInteraction,
	tournament: ManualTournament,
	friendCode?: number
): Promise<void> {
	const player: ManualParticipant = new ManualParticipant();
	player.discordId = interaction.user.id;
	player.tournament = tournament;
	player.friendCode = friendCode;
	await player.save();
	await interaction.update({});
	await interaction.user.send(
		"Please upload screenshots of your decklist to register.\n**Important**: Please do not delete your message! This can make your decklist invisible to tournament hosts, which they may interpret as cheating."
	);
}

export class RegisterButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["registerButton"];

	async click(interaction: ButtonInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		const tournament = await ManualTournament.findOneOrFail({
			where: { owningDiscordServer: interaction.guildId, registerMessage: interaction.message.id }
		});

		if (tournament.status !== TournamentStatus.PREPARING) {
			await interaction.user.send("Sorry, registration for the tournament has closed!");
			return;
		}
		if (tournament.participantLimit > 0 && tournament.participants?.length >= tournament.participantLimit) {
			await interaction.user.send("Sorry, the tournament is currently full!");
			return;
		}
		if (tournament.requireFriendCode) {
			const modal = new ModalBuilder().setCustomId("registerModal").setTitle(`Register for ${tournament.name}`);
			const deckLabelInput = new TextInputBuilder()
				.setCustomId("friendCode")
				.setLabel("Master Duel Friend Code")
				.setStyle(TextInputStyle.Short)
				.setRequired(tournament.requireFriendCode)
				.setPlaceholder("000000000")
				.setMinLength(9)
				.setMaxLength(11);
			const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(deckLabelInput);
			modal.addComponents(actionRow);
			await interaction.showModal(modal);
		} else {
			await registerParticipant(interaction, tournament);
		}
	}
}

function parseFriendCode(input: string): number | undefined {
	const friendCode = parseInt(input.replaceAll(/[^\d]/g, ""));
	if (friendCode < 10e9) {
		return friendCode;
	}
}

export class FriendCodeModalHandler implements MessageModalSubmitHandler {
	readonly modalIds = ["registerModal"];

	async submit(interaction: ModalMessageModalSubmitInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		const tournament = await ManualTournament.findOneOrFail({
			where: { owningDiscordServer: interaction.guildId, registerMessage: interaction.message.id }
		});

		const friendCodeString = interaction.fields.getTextInputValue("friendCode");
		const friendCode = parseFriendCode(friendCodeString);
		if (!friendCode && tournament.requireFriendCode) {
			await interaction.reply({
				content: `This tournament requires a Master Duel friend code, and you did not enter a valid one! Please try again, ${interaction.user}!`,
				ephemeral: true
			});
			return;
		}
		await registerParticipant(interaction, tournament, friendCode);
	}
}
