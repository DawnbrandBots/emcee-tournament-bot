import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	GuildMember,
	PartialGuildMember,
	SlashCommandStringOption,
	User,
	userMention
} from "discord.js";
import { ILike } from "typeorm";
import { TournamentStatus } from "../database/interface";
import { ManualParticipant, ManualTournament } from "../database/orm";
import { send } from "../util/discord";

export const tournamentOption = new SlashCommandStringOption()
	.setName("tournament")
	.setDescription("The name of the tournament to edit.")
	.setRequired(true)
	.setAutocomplete(true);

export async function autocompleteTournament(interaction: AutocompleteInteraction<"cached">): Promise<void> {
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
	interaction: ChatInputCommandInteraction<"cached"> | ContextMenuCommandInteraction<"cached">,
	isDeferred = false
): Promise<boolean> {
	const func = isDeferred ? "editReply" : "reply";
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
	interaction: ChatInputCommandInteraction<"cached">
): Promise<ManualParticipant | undefined> {
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
	member: GuildMember | PartialGuildMember | User,
	interaction?: ChatInputCommandInteraction | ContextMenuCommandInteraction
): Promise<void> {
	// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
	// TODO: fix above? also handle when can't find role
	if ("roles" in member) {
		await member.roles.remove(tournament.participantRole, "Dropped from tournament.");
	}

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

	const hostMessage = `${userMention(member.id)} has been dropped from ${tournament.name}.`;

	if (interaction && interaction.commandName !== "drop") {
		await interaction.reply(hostMessage);
	} else if (tournament.privateChannel) {
		await send(member.client, tournament.privateChannel, hostMessage);
	}
	return;
}

export const printPlayerCap = (tournament: ManualTournament): string =>
	tournament.participantLimit === 0 ? "Uncapped" : tournament.participantLimit.toString(10);
