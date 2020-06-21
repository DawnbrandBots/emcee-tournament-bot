import { TournamentModel, Tournament } from "../models";

type DiscordID = string;
type TournamentID = string;

export async function initTournament(
	organizer: DiscordID, server: DiscordID, challongeId: string,
	name?: string, description?: string
): Promise<TournamentID> {
	const tournament = new TournamentModel({
		name,
		description,
		challongeId,
		organizer,
		owningDiscordServer: server
	});
	await tournament.save();
	return tournament.id;
}

async function getAuthorizedTournament(
	tournamentId: TournamentID, organizer: DiscordID
): Promise<Tournament> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	if (!tournament.organizers.includes(organizer)) {
		throw new Error(`Organizer ${organizer} not authorized for tournament ${tournamentId}`);
	}
	return tournament;
}

export async function addAnnouncementChannel(
	channel: DiscordID, tournamentId: TournamentID, organizer: DiscordID
): Promise<void> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
	tournament.discordChannels.push(channel);
	await tournament.save();
}

export async function removeAnnouncementChannel(
	channel: DiscordID, tournamentId: TournamentID, organizer: DiscordID
): Promise<boolean> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
	const i = tournament.discordChannels.indexOf(channel);
	if (i < 0) {
		return false;
	}
	tournament.discordChannels.splice(i, 1);
	await tournament.save();
	return true;
}
