import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction } from "discord.js";
import { TournamentStatus } from "../database/interface";
import { ManualTournament } from "../database/orm";

export async function autocompleteTournament(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
	if (!interaction.inCachedGuild()) {
		return;
	}
	const partialName = interaction.options.getFocused();
	const owningDiscordServer = interaction.guildId;
	const tournaments = await ManualTournament.find({
		where: [
			{ owningDiscordServer, status: TournamentStatus.IPR },
			{ owningDiscordServer, status: TournamentStatus.PREPARING }
		]
	});
	// can we do this natively with .find? should match all for blank input
	const matchingTournaments = tournaments
		.filter(t => t.name.includes(partialName))
		.slice(0, 25)
		.map(t => {
			return { name: t.name, value: t.name };
		});
	await interaction.respond(matchingTournaments);
}

export async function authenticateHost(
	tournament: ManualTournament,
	interaction: ChatInputCommandInteraction
): Promise<boolean> {
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
