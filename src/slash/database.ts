import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	ChatInputCommandInteraction,
	ComponentType,
	DiscordAPIError,
	DiscordjsErrorCodes,
	Message,
	ModalBuilder,
	ModalSubmitInteraction,
	SlashCommandStringOption,
	TextInputBuilder,
	TextInputStyle,
	userMention
} from "discord.js";
import { Logger } from "../util/logger";
import { ILike } from "typeorm";
import { TournamentStatus } from "../database/interface";
import { ManualDeckSubmission, ManualParticipant, ManualTournament } from "../database/orm";
import { send } from "../util/discord";

export const tournamentOption = new SlashCommandStringOption()
	.setName("tournament")
	.setDescription("The name of the tournament to edit.")
	.setRequired(true)
	.setAutocomplete(true);

export async function autocompleteTournament(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
	if (!interaction.inCachedGuild()) {
		return;
	}
	const partialName = interaction.options.getFocused();
	const owningDiscordServer = interaction.guildId;
	const tournaments = await ManualTournament.find({
		where: [
			{ owningDiscordServer, status: TournamentStatus.IPR, name: ILike(`%${partialName}%`) },
			{ owningDiscordServer, status: TournamentStatus.PREPARING, name: ILike(`%${partialName}%`) }
		]
	});
	const matchingTournaments = tournaments.slice(0, 25).map(t => {
		return { name: t.name, value: t.name };
	});
	await interaction.respond(matchingTournaments);
}

export async function authenticateHost(
	tournament: ManualTournament,
	interaction: ChatInputCommandInteraction
): Promise<boolean> {
	if (!interaction.inCachedGuild()) {
		return false;
	}
	if (tournament.owningDiscordServer !== interaction.guildId) {
		await interaction.reply({ content: `That tournament isn't in this server.`, ephemeral: true });
		return false;
	}
	if (!tournament.hosts.includes(interaction.user.id)) {
		await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
		return false;
	}
	return true;
}

export async function authenticatePlayer(
	tournament: ManualTournament,
	interaction: ChatInputCommandInteraction
): Promise<ManualParticipant | undefined> {
	if (!interaction.inCachedGuild()) {
		return;
	}
	if (tournament.owningDiscordServer !== interaction.guildId) {
		await interaction.reply({ content: `That tournament isn't in this server.`, ephemeral: true });
		return;
	}
	const player = tournament.participants.find(p => (p.discordId = interaction.id));
	if (!player) {
		await interaction.reply({ content: `You are not in that tournament.`, ephemeral: true });
		return;
	}
	return player;
}

export function generateDeckValidateButtons(): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId("reject").setLabel("Reject").setStyle(ButtonStyle.Danger)
	);
	return row;
}

async function awaitModalInteraction(
	modalInteraction: ModalSubmitInteraction<CacheType>,
	deck: ManualDeckSubmission,
	tournament: ManualTournament,
	response: Message
): Promise<void> {
	const player = await response.client.users.fetch(deck.discordId);
	if (modalInteraction.customId === "acceptModal") {
		// mark deck as approved
		deck.approved = true;
		const label = modalInteraction.fields.getTextInputValue("acceptDeckLabel");
		if (label.length > 0) {
			deck.label = label;
		}
		await deck.save();
		// provide feedback to player
		await player.send(`Your deck has been accepted by the hosts! You are now registered for ${tournament.name}.`);
		// TODO: Give player participant role
		// log success to TO
		if (tournament.privateChannel) {
			await send(
				response.client,
				tournament.privateChannel,
				`${userMention}'s deck for ${tournament.name} has been approved by ${userMention(
					modalInteraction.user.id
				)}`
			);
		}
		return;
	}
	// if (modalInteraction.customId === "rejectModal")
	// clear deck submission
	await deck.remove(); // do we need to update the link on the player's end?
	// provide feedback to player
	let message = `Your deck has been rejected by the hosts. Please update your deck and try again.`;
	const reason = modalInteraction.fields.getTextInputValue("rejectReason");
	if (reason.length > 0) {
		message += `\nReason: ${reason}`;
	}
	await player.send(message);
	// log success to TO
	if (tournament.privateChannel) {
		await send(
			response.client,
			tournament.privateChannel,
			`${userMention}'s deck for ${tournament.name} has been rejected by ${userMention(modalInteraction.user.id)}`
		);
	}
	return;
}

export function awaitDeckValidationButtons(
	commandInteraction: ChatInputCommandInteraction,
	response: Message,
	tournament: ManualTournament,
	logger: Logger,
	deck: ManualDeckSubmission
): void {
	const filter = (i: ButtonInteraction): boolean => {
		if (tournament.hosts.includes(i.user.id)) {
			return true;
		}
		i.reply({ content: `Decks can only be validated by a tournament host.`, ephemeral: true }).catch(e =>
			logger.error(e)
		);
		return false;
	};

	response
		.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 })
		.then(async buttonInteraction => {
			if (buttonInteraction.customId === "accept") {
				const modal = new ModalBuilder().setCustomId("acceptModal").setTitle("Accept Deck");
				const deckLabelInput = new TextInputBuilder()
					.setCustomId("acceptDeckLabel")
					.setLabel("What is the deck's theme?")
					.setStyle(TextInputStyle.Short)
					.setRequired(false);
				const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(deckLabelInput);
				modal.addComponents(actionRow);
				await buttonInteraction.showModal(modal);
			} else {
				// if (i.customId === "reject")
				const modal = new ModalBuilder().setCustomId("rejectModal").setTitle("Reject Deck");
				const rejectReasonInput = new TextInputBuilder()
					.setCustomId("rejectReason")
					.setLabel("Why is the deck illegal?")
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(false);
				const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(rejectReasonInput);
				modal.addComponents(actionRow);
				await buttonInteraction.showModal(modal);
			}
			buttonInteraction
				.awaitModalSubmit({ componentType: ComponentType.TextInput, time: 15000 })
				.then(m => awaitModalInteraction(m, deck, tournament, response))
				.catch(e => logger.error(e));
		})
		.catch(async (err: DiscordAPIError) => {
			// a rejection can just mean the timeout was reached without a response
			// otherwise, though, we want to treat it as a normal error
			if (err.code !== DiscordjsErrorCodes.InteractionCollectorError) {
				logger.error(err);
			}
			// remove original button, regardless of error source
			let outMessage = `__**${userMention(deck.discordId)}'s deck**__:`;
			if (deck.label) {
				outMessage += `\n**Theme**: ${deck.label}`;
			}
			outMessage += `\n${deck.content}`;
			commandInteraction.editReply({ content: outMessage, components: [] }).catch(e => logger.error(e));
		});
}

export function checkParticipantCap(tournament: ManualTournament, capacity?: number): boolean {
	if (!capacity) {
		capacity = tournament.participantLimit;
	}
	if (capacity === 0) {
		return true;
	}
	return tournament.decks.length < capacity;
}
