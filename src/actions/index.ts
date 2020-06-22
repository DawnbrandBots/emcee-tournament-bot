import { TournamentModel, TournamentDoc } from "../models";

type DiscordID = string;
type TournamentID = string; // from Challonge

// Invoke after an organiser requests a tournament and it is created on Challonge
export async function initTournament(
	organiser: DiscordID,
	server: DiscordID,
	challongeId: TournamentID,
	name?: string,
	description?: string
): Promise<void> {
	const tournament = new TournamentModel({
		name,
		description,
		challongeId,
		organiser,
		owningDiscordServer: server
	});
	await tournament.save();
}

export class TournamentNotFoundError extends Error {
	challongeId: TournamentID;

	constructor(challongeId: TournamentID) {
		super(`Unknown tournament ${challongeId}`);
		this.challongeId = challongeId;
	}
}

export async function findTournament(challongeId: TournamentID): Promise<TournamentDoc> {
	const tournament = await TournamentModel.findOne({ challongeId });
	if (!tournament) {
		throw new TournamentNotFoundError(challongeId);
	}
	return tournament;
}

export class UnauthorizedOrganiserError extends Error {
	organiser: DiscordID;
	challongeId: TournamentID;

	constructor(challongeId: TournamentID, organiser: DiscordID) {
		super(`Organiser ${organiser} not authorized for tournament ${challongeId}`);
		this.organiser = organiser
		this.challongeId = challongeId;
	}
}

// Internal helper
async function getAuthorizedTournament(challongeId: TournamentID, organiser: DiscordID): Promise<TournamentDoc> {
	const tournament = await findTournament(challongeId);
	if (!tournament.organisers.includes(organiser)) {
		throw new UnauthorizedOrganiserError(challongeId, organiser);
	}
	return tournament;
}

export async function addAnnouncementChannel(
	channel: DiscordID,
	challongeId: TournamentID,
	organiser: DiscordID,
	kind: "public" | "private" = "public"
): Promise<void> {
	const tournament = await getAuthorizedTournament(challongeId, organiser);
	const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
	channels.push(channel);
	await tournament.save();
}

export async function removeAnnouncementChannel(
	channel: DiscordID,
	challongeId: TournamentID,
	organiser: DiscordID,
	kind: "public" | "private" = "public"
): Promise<boolean> {
	const tournament = await getAuthorizedTournament(challongeId, organiser);
	const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
	const i = channels.indexOf(channel);
	if (i < 0) {
		return false;
	}
	channels.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}

// Check if a Discord user can perform a Discord action related to a tournament.
export async function isOrganising(organiser: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	return tournament.organisers.includes(organiser);
}

export async function addOrganiser(organiser: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	if (tournament.organisers.includes(organiser)) {
		return false;
	}
	tournament.organisers.push(organiser);
	await tournament.save();
	return true;
}

export async function removeOrganiser(organiser: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	if (tournament.organisers.length < 2 || !tournament.organisers.includes(organiser)) {
		return false;
	}
	const i = tournament.organisers.indexOf(organiser);
	// i < 0 is impossible by precondition
	tournament.organisers.splice(i, 1);
	await tournament.save();
	return true;
}

export async function findTournamentByRegisterMessage(
	messageId: DiscordID,
	channelId: DiscordID
): Promise<TournamentDoc | null> {
	return await TournamentModel.findOne({
		registerMessages: {
			channel: channelId,
			message: messageId
		}
	});
}

// Invoke after a registration message has been sent to an announcement channel.
export async function addRegisterMessage(
	messageId: DiscordID,
	channelId: DiscordID,
	challongeId: TournamentID
): Promise<void> {
	const tournament = await findTournament(challongeId);
	tournament.registerMessages.push({ message: messageId, channel: channelId });
	await tournament.save();
}

// Invoke after a registration message gets deleted.
export async function removeRegisterMessage(messageId: DiscordID, channelId: DiscordID): Promise<boolean> {
	const tournament = await findTournamentByRegisterMessage(messageId, channelId);
	if (!tournament) {
		return false;
	}
	const i = tournament.registerMessages.indexOf({ message: messageId, channel: channelId });
	// i < 0 is impossible by precondition
	tournament.registerMessages.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}

// Invoke after a user requests to join a tournament and the appropriate response is delivered.
export async function addPendingParticipant(
	messageId: DiscordID,
	channelId: DiscordID,
	user: DiscordID
): Promise<boolean> {
	const tournament = await findTournamentByRegisterMessage(messageId, channelId);
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
	messageId: DiscordID,
	channelId: DiscordID,
	user: DiscordID
): Promise<boolean> {
	const tournament = await TournamentModel.findOne({
		registerMessages: { message: messageId, channel: channelId },
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

// Remove all pending participants and start the tournament
export async function startTournament(
	challongeId: TournamentID,
	organiser: DiscordID,
	rounds: number
): Promise<string[]> {
	const tournament = await getAuthorizedTournament(challongeId, organiser);
	const removedIDs = tournament.pendingParticipants.slice(); // clone values
	tournament.pendingParticipants = [];
	tournament.status = "in progress";
	tournament.currentRound = 1;
	tournament.totalRounds = rounds;
	await tournament.save();
	return removedIDs;
}

// Progresses tournament to the next round or returns -1 if it was already the final round
export async function nextRound(challongeId: TournamentID, organiser: DiscordID): Promise<number> {
	const tournament = await getAuthorizedTournament(challongeId, organiser);
	if (tournament.status !== "in progress") {
		throw new Error(`Tournament ${challongeId} is not in progress.`);
	}
	if (tournament.currentRound < tournament.totalRounds) {
		++tournament.currentRound;
		await tournament.save();
		return tournament.currentRound;
	}
	return -1;
}

// Sets tournament status to completed
export async function finishTournament(challongeId: TournamentID, organiser: DiscordID): Promise<void> {
	const tournament = await getAuthorizedTournament(challongeId, organiser);
	tournament.status = "complete";
	await tournament.save();
}

// Invoke after a participant's deck is validated and they are registered on Challonge
export async function confirmParticipant(
	tournamentId: DiscordID,
	participantId: DiscordID,
	challongeId: number,
	main: number[],
	extra: number[],
	side: number[]
): Promise<boolean> {
	const tournament = await TournamentModel.findOne({ challongeId: tournamentId });
	if (!tournament) {
		return false;
	}
	const i = tournament.pendingParticipants.indexOf(participantId);
	if (i >= 0) {
		tournament.pendingParticipants.splice(i, 1); // consider $pullAll
	}
	const participant = tournament.confirmedParticipants.find(p => p.discord === participantId);
	if (participant) {
		participant.deck = { main, extra, side };
	} else {
		tournament.confirmedParticipants.push({
			challongeId,
			discord: participantId,
			deck: { main, extra, side }
		});
	}
	await tournament.save();
	return true;
}
