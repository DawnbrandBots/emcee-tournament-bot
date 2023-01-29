import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	GuildMember,
	SlashCommandStringOption,
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

export async function dropPlayer(
	interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
	tournament: ManualTournament,
	player: ManualParticipant,
	member: GuildMember,
	self = false
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

	if (self) {
		await interaction.reply(`You have been dropped from ${tournament.name}.`);
		if (tournament.privateChannel) {
			// is there a better way to do this than the old util?
			// should we be storing only the channel ID?
			await send(
				interaction.client,
				tournament.privateChannel,
				`${userMention(interaction.user.id)} has dropped themself from ${tournament.name}.`
			);
		}
		return;
	}

	await member.send(`You have been dropped from ${tournament.name} by the hosts.`);
	await interaction.reply(`${userMention(member.id)} has been dropped from ${tournament.name}.`);
}
