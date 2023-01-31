import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	GuildMember,
	ModalBuilder,
	ModalMessageModalSubmitInteraction,
	PartialGuildMember,
	SlashCommandStringOption,
	TextInputBuilder,
	TextInputStyle,
	userMention
} from "discord.js";
import { ILike } from "typeorm";
import { TournamentStatus } from "../database/interface";
import { ManualDeckSubmission, ManualParticipant, ManualTournament } from "../database/orm";
import { send } from "../util/discord";
import { ButtonClickHandler, MessageModalSubmitHandler } from "../SlashCommand";

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
	interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
	isDeferred = false
): Promise<boolean> {
	const func = isDeferred ? "editReply" : "reply";
	if (!interaction.inCachedGuild()) {
		return false;
	}
	if (tournament.owningDiscordServer !== interaction.guildId) {
		// ephemeral response preferred but deferred commands have to stay consistent and should be public in success
		await interaction[func]({ content: `That tournament isn't in this server.`, ephemeral: !isDeferred });
		return false;
	}
	if (!tournament.hosts.includes(interaction.user.id)) {
		await interaction[func]({ content: `You cannot use this.`, ephemeral: !isDeferred });
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

export function encodeCustomId(idName: string, ...args: Array<string | number>): string {
	args.unshift(idName);
	return args.join("#");
}

export function decodeCustomId(id: string): string[] {
	const args = id.split("#");
	// the result of spllit has at least 1 entry unless the string is empty
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const name = args.shift()!;
	return [name, ...args];
}

export function generateDeckValidateButtons(tournament: ManualTournament): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(encodeCustomId("accept", tournament.tournamentId))
			.setLabel("Accept")
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(encodeCustomId("reject", tournament.tournamentId))
			.setLabel("Reject")
			.setStyle(ButtonStyle.Danger)
	);
	return row;
}

export class AcceptButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["accept"];

	async click(interaction: ButtonInteraction, ...args: string[]): Promise<void> {
		const tournamentIdString = args[0];
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

export class RejectButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["reject"];

	async click(interaction: ButtonInteraction, ...args: string[]): Promise<void> {
		const tournamentIdString = args[0];
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
		// mark deck as approved
		deck.approved = true;
		const label = interaction.fields.getTextInputValue("acceptDeckLabel");
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
				interaction.client,
				tournament.privateChannel,
				`${userMention}'s deck for ${tournament.name} has been approved by ${userMention(interaction.user.id)}`
			);
		}
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
		if (tournament.privateChannel) {
			await send(
				interaction.client,
				tournament.privateChannel,
				`${userMention}'s deck for ${tournament.name} has been rejected by ${userMention(interaction.user.id)}`
			);
		}
	}
}

export function checkParticipantCap(
	tournament: ManualTournament,
	capacity?: number,
	participantsLoaded = false
): boolean {
	if (!capacity) {
		capacity = tournament.participantLimit;
	}
	if (capacity === 0) {
		return true;
	}
	const referenceArray = participantsLoaded
		? tournament.participants.filter(p => !!p.deck).map(p => p.deck)
		: tournament.decks;
	return referenceArray.length < capacity;
}

export async function dropPlayer(
	tournament: ManualTournament,
	player: ManualParticipant,
	member: GuildMember | PartialGuildMember,
	interaction?: ChatInputCommandInteraction | ContextMenuCommandInteraction
): Promise<void> {
	// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
	// TODO: fix above? also handle when can't find role
	await member.roles.remove(tournament.participantRole);
	if (tournament.status === TournamentStatus.PREPARING) {
		await player.remove();
	} else {
		player.dropped = true;
		await player.save();
	}

	const playerMessage = `You have been dropped from ${tournament.name}.`;

	if (interaction?.commandName === "drop") {
		await interaction.reply(playerMessage);
	} else {
		await member.send(playerMessage);
	}

	const hostMessage = `${userMention(member.user.id)} has been dropped from ${tournament.name}.`;

	if (interaction && interaction.commandName !== "drop") {
		await interaction.reply(hostMessage);
	} else if (tournament.privateChannel) {
		await send(member.client, tournament.privateChannel, hostMessage);
	}
	return;
}
