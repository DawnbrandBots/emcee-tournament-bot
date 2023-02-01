import { ButtonStyle, RESTPostAPIApplicationCommandsJSONBody, TextInputStyle } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ChatInputCommandInteraction,
	ModalBuilder,
	ModalMessageModalSubmitInteraction,
	SlashCommandBuilder,
	TextInputBuilder,
	userMention
} from "discord.js";
import { ManualDeckSubmission, ManualTournament } from "../database/orm";
import { encodeCustomId } from "../events/interaction";
import { AutocompletableCommand, ButtonClickHandler, MessageModalSubmitHandler } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class DeckCommand extends AutocompletableCommand {
	#logger = getLogger("command:deck");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("deck")
			.setDescription("Check and validate the contents of a player's deck.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.addUserOption(option =>
				option.setName("player").setDescription("The player to display their deck.").setRequired(true)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName }
		});

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const user = interaction.options.getUser("player", true);
		const playerDeck = tournament.decks.find(d => d.discordId === user.id);
		if (!playerDeck) {
			await interaction.reply({
				content: `That player is not in the tournament, or has not submitted a deck.`,
				ephemeral: true
			});
			return;
		}

		let outMessage = `__**${userMention(user.id)}'s deck**__:`;
		if (playerDeck.label) {
			outMessage += `\n**Theme**: ${playerDeck.label}`;
		}
		outMessage += `\n${playerDeck.content}`;

		if (playerDeck.approved) {
			await interaction.reply(outMessage);
			return;
		}

		const row = generateDeckValidateButtons(tournament.tournamentId, playerDeck.message);
		await interaction.reply({ content: outMessage, components: [row] });
	}
}

export function generateDeckValidateButtons(tournamentId: number, messageId: string): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(encodeCustomId("accept", tournamentId, messageId))
			.setLabel("Accept")
			.setStyle(ButtonStyle.Success)
			.setEmoji("✅"),
		new ButtonBuilder()
			.setCustomId(encodeCustomId("quickaccept", tournamentId, messageId))
			.setLabel("Accept (No Theme)")
			.setStyle(ButtonStyle.Success)
			.setEmoji("⏩"),
		new ButtonBuilder()
			.setCustomId(encodeCustomId("reject", tournamentId, messageId))
			.setLabel("Reject")
			.setStyle(ButtonStyle.Danger)
			.setEmoji("❌")
	);
	return row;
}

export class AcceptButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["accept"];

	async click(interaction: ButtonInteraction, ...args: string[]): Promise<void> {
		const [tournamentIdString, sourceMessageId] = args;
		const tournamentId = parseInt(tournamentIdString, 10);
		const deck = await ManualDeckSubmission.findOneOrFail({
			where: {
				discordId: interaction.user.id,
				tournamentId
			}
		});
		if (deck.message !== sourceMessageId) {
			await interaction.reply(`This deck is outdated, the player has submitted a newer one!`);
			return;
		}
		const modal = new ModalBuilder()
			.setCustomId(encodeCustomId("acceptModal", tournamentIdString))
			.setTitle("Accept Deck");
		const deckLabelInput = new TextInputBuilder()
			.setCustomId("acceptDeckLabel")
			.setLabel("What is the deck's theme?")
			.setStyle(TextInputStyle.Short)
			.setRequired(false);
		const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(deckLabelInput);
		modal.addComponents(actionRow);
		await interaction.showModal(modal);
	}
}

export class QuickAcceptButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["quickaccept"];

	async click(interaction: ButtonInteraction<"cached">, ...args: string[]): Promise<void> {
		// c/p from AcceptLabelModalHandler
		const [tournamentIdString, sourceMessageId] = args;
		const tournamentId = parseInt(tournamentIdString, 10);
		const deck = await ManualDeckSubmission.findOneOrFail({
			where: {
				discordId: interaction.user.id,
				tournamentId
			}
		});
		if (deck.message !== sourceMessageId) {
			await interaction.reply(`This deck is outdated, the player has submitted a newer one!`);
			return;
		}
		const player = await interaction.client.users.fetch(deck.discordId);
		deck.approved = true;
		await deck.save();

		const tournament = await ManualTournament.findOneOrFail({ where: { tournamentId } });
		await interaction.guild.members.addRole({
			user: interaction.user.id,
			role: tournament.participantRole,
			reason: `Deck approved by ${interaction.user.tag}`
		});
		await player.send(`Your deck has been accepted by the hosts! You are now registered for ${tournament.name}.`);
		// log success to TO
		await interaction.reply(
			`${userMention(player.id)}'s deck for ${tournament.name} has been approved by ${userMention(
				interaction.user.id
			)}`
		);
	}
}

export class RejectButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["reject"];

	async click(interaction: ButtonInteraction, ...args: string[]): Promise<void> {
		const [tournamentIdString, sourceMessageId] = args;
		const tournamentId = parseInt(tournamentIdString, 10);
		const deck = await ManualDeckSubmission.findOneOrFail({
			where: {
				discordId: interaction.user.id,
				tournamentId
			}
		});
		if (deck.message !== sourceMessageId) {
			await interaction.reply(`This deck is outdated, the player has submitted a newer one!`);
			return;
		}
		const modal = new ModalBuilder()
			.setCustomId(encodeCustomId("rejectModal", tournamentIdString))
			.setTitle("Reject Deck");
		const rejectReasonInput = new TextInputBuilder()
			.setCustomId("rejectReason")
			.setLabel("Why is the deck illegal?")
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false);
		const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(rejectReasonInput);
		modal.addComponents(actionRow);
		await interaction.showModal(modal);
	}
}

export class AcceptLabelModal implements MessageModalSubmitHandler {
	readonly modalIds = ["acceptModal"];

	async submit(interaction: ModalMessageModalSubmitInteraction<"cached">, ...args: string[]): Promise<void> {
		const tournamentIdString = args[0];
		const tournamentId = parseInt(tournamentIdString, 10);
		const deck = await ManualDeckSubmission.findOneOrFail({
			where: {
				discordId: interaction.user.id,
				tournamentId
			}
		});
		const player = await interaction.client.users.fetch(deck.discordId);
		deck.approved = true;
		const label = interaction.fields.getTextInputValue("acceptDeckLabel");
		if (label.length > 0) {
			deck.label = label;
		}
		await deck.save();

		const tournament = await ManualTournament.findOneOrFail({ where: { tournamentId } });
		await interaction.guild.members.addRole({
			user: interaction.user.id,
			role: tournament.participantRole,
			reason: `Deck approved by ${interaction.user.tag}`
		});
		await player.send(`Your deck has been accepted by the hosts! You are now registered for ${tournament.name}.`);
		// log success to TO
		await interaction.reply(
			`${userMention(player.id)}'s deck for ${tournament.name} has been approved by ${userMention(
				interaction.user.id
			)}`
		);
	}
}

export class RejectReasonModal implements MessageModalSubmitHandler {
	readonly modalIds = ["rejectModal"];

	async submit(interaction: ModalMessageModalSubmitInteraction, ...args: string[]): Promise<void> {
		const tournamentIdString = args[0];
		const deck = await ManualDeckSubmission.findOneOrFail({
			where: {
				discordId: interaction.user.id,
				tournamentId: parseInt(tournamentIdString, 10)
			},
			relations: ["tournament"]
		});
		const tournament = deck.tournament;
		const player = await interaction.client.users.fetch(deck.discordId);
		// clear deck submission
		await deck.remove(); // do we need to update the link on the player's end?
		// provide feedback to player
		let message = `Your deck has been rejected by the hosts. Please update your deck and try again.`;
		const reason = interaction.fields.getTextInputValue("rejectReason");
		if (reason.length > 0) {
			message += `\nReason: ${reason}`;
		}
		await player.send(message);
		// log success to TO
		await interaction.reply(
			`${userMention(player.id)}'s deck for ${tournament.name} has been rejected by ${userMention(
				interaction.user.id
			)}`
		);
	}
}
