import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";
import { ILike } from "typeorm";
import { TournamentStatus } from "../database/interface";
import { ManualParticipant, ManualTournament } from "../database/orm";

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