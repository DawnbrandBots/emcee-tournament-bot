import { TournamentModel, TournamentDoc } from "../models";

type DiscordID = string;
type TournamentID = string;

// Invoke after an organizer requests a tournament and it is created on Challonge
export async function initTournament(
	organizer: DiscordID,
	server: DiscordID,
	challongeId: string,
	name?: string,
	description?: string
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
async function getAuthorizedTournament(tournamentId: TournamentID, organizer: DiscordID): Promise<TournamentDoc> {
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
	channel: DiscordID,
	tournamentId: TournamentID,
	organizer: DiscordID,
	kind: "public" | "private" = "public"
): Promise<void> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
	const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
	channels.push(channel);
	await tournament.save();
}

export async function removeAnnouncementChannel(
	channel: DiscordID,
	tournamentId: TournamentID,
	organizer: DiscordID,
	kind: "public" | "private" = "public"
): Promise<boolean> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
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
export async function isOrganizing(organizer: DiscordID, tournamentId: TournamentID): Promise<boolean> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	return tournament.organizers.includes(organizer);
}

export async function addOrganizer(organizer: DiscordID, tournamentId: TournamentID): Promise<boolean> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	if (tournament.organizers.includes(organizer)) {
		return false;
	}
	tournament.organizers.push(organizer);
	await tournament.save();
	return true;
}

export async function removeOrganizer(organizer: DiscordID, tournamentId: TournamentID): Promise<boolean> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	if (tournament.organizers.length < 2 || !tournament.organizers.includes(organizer)) {
		return false;
	}
	const i = tournament.organizers.indexOf(organizer);
	// i < 0 is impossible by precondition
	tournament.organizers.splice(i, 1);
	await tournament.save();
	return true;
}

export async function findTournamentByRegisterMessage(
	channelId: DiscordID,
	messageId: DiscordID
): Promise<TournamentID | null> {
	const tournament = await TournamentModel.findOne({
		registerMessages: {
			channel: channelId,
			message: messageId
		}
	});
	return tournament ? tournament.id : null;
}

// Invoke after a registration message has been sent to an announcement channel.
export async function addRegisterMessage(
	messageId: DiscordID,
	channelId: DiscordID,
	tournamentId: TournamentID
): Promise<void> {
	const tournament = await TournamentModel.findById(tournamentId);
	if (!tournament) {
		throw new Error(`Unknown tournament ${tournamentId}`);
	}
	tournament.registerMessages.push({ message: messageId, channel: channelId });
	await tournament.save();
}

// Invoke after a registration message gets deleted.
export async function removeRegisterMessage(messageId: DiscordID, channelId: DiscordID): Promise<boolean> {
	const tournament = await TournamentModel.findOne({ registerMessages: { message: messageId, channel: channelId } });
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
	const tournament = await TournamentModel.findOne({ registerMessages: { message: messageId, channel: channelId } });
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
export async function startTournament(tournamentId: TournamentID, organizer: DiscordID): Promise<string[]> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
	const removedIDs = tournament.pendingParticipants.slice(); // clone values
	tournament.pendingParticipants = [];
	tournament.status = "in progress";
	await tournament.save();
	return removedIDs;
}

// Progresses tournament to the next round or returns -1 if it was already the final round
export async function nextRound(tournamentId: TournamentID, organizer: DiscordID): Promise<number> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
	if (tournament.status !== "in progress") {
		throw new Error(`Tournament ${tournamentId} is not in progress.`);
	}
	if (tournament.currentRound < tournament.totalRounds) {
		++tournament.currentRound;
		await tournament.save();
		return tournament.currentRound;
	}
	return -1;
}

// Sets tournament status to completed
export async function finishTournament(tournamentId: TournamentID, organizer: DiscordID): Promise<void> {
	const tournament = await getAuthorizedTournament(tournamentId, organizer);
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
	const tournament = await TournamentModel.findById(tournamentId);
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
