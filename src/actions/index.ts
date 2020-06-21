import { TournamentModel, Tournament } from "../models";

type DiscordID = string;
type TournamentID = string;

// Invoke after an organizer requests a tournament and it is created on Challonge
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

// Internal helper
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
	tournament.discordChannels.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}

// Check if a Discord user can perform a Discord action related to a tournament.
export async function isOrganizing(
	organizer: DiscordID, tournamentId: TournamentID
): Promise<boolean> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	return tournament.organizers.includes(organizer);
}

export async function findTournamentByRegisterMessage(messageId: DiscordID): Promise<TournamentID | null> {
	const tournament = await TournamentModel.findOne({ registerMessages: messageId });
	return tournament ? tournament.id : null;
}

// Invoke after a registration message has been sent to an announcement channel.
export async function addRegisterMessage(
	messageId: DiscordID, tournamentId: TournamentID
): Promise<void> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	tournament.registerMessages.push(messageId);
	await tournament.save();
}

// Invoke after a registration message gets deleted.
export async function removeRegisterMessage(messageId: DiscordID): Promise<boolean> {
	const tournament = await TournamentModel.findOne({ registerMessages: messageId });
	if (!tournament) {
		return false;
	}
	const i = tournament.registerMessages.indexOf(messageId);
	// i < 0 is impossible by precondition
	tournament.registerMessages.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}

// Invoke after a user requests to join a tournament and the appropriate response is delivered.
export async function addPendingParticipant(
	messageId: DiscordID, user: DiscordID
): Promise<boolean> {
	const tournament = await TournamentModel.findOne({ registerMessages: messageId });
	if (!tournament) {
		return false;
	}
	if (!tournament.pendingParticipants.includes(user)) {
		tournament.pendingParticipants.push(user);
		await tournament.save();
	}
	return true;
}

// Invoke after a user requests to leave a tournament they haven't been confirmed for.
export async function removePendingParticipant(
	messageId: DiscordID, user: DiscordID
): Promise<boolean> {
	const tournament = await TournamentModel.findOne({
		registerMessages: messageId,
		pendingParticipants: user
	});
	if (!tournament) {
		return false;
	}
	const i = tournament.pendingParticipants.indexOf(user);
	// i < 0 is impossible by precondition
	tournament.pendingParticipants.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}
