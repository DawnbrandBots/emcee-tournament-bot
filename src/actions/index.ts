import { TournamentModel, TournamentDoc } from "../models";
import { TournamentNotFoundError, UnauthorisedHostError } from "../errors";

type DiscordID = string;
type TournamentID = string; // from Challonge

// Invoke after a host requests a tournament and it is created on Challonge
export async function initTournament(
	host: DiscordID,
	server: DiscordID,
	challongeId: TournamentID,
	name: string,
	description: string
): Promise<void> {
	const tournament = new TournamentModel({
		name,
		description,
		challongeId,
		hosts: [host],
		owningDiscordServer: server
	});
	await tournament.save();
}

export async function findTournament(challongeId: TournamentID): Promise<TournamentDoc> {
	const tournament = await TournamentModel.findOne({ challongeId });
	if (!tournament) {
		throw new TournamentNotFoundError(challongeId);
	}
	return tournament;
}

// Internal helper
async function getAuthorizedTournament(challongeId: TournamentID, host: DiscordID): Promise<TournamentDoc> {
	const tournament = await findTournament(challongeId);
	if (!tournament.hosts.includes(host)) {
		throw new UnauthorisedHostError(host, challongeId);
	}
	return tournament;
}

export async function addAnnouncementChannel(
	channel: DiscordID,
	challongeId: TournamentID,
	host: DiscordID,
	kind: "public" | "private" = "public"
): Promise<void> {
	const tournament = await getAuthorizedTournament(challongeId, host);
	const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
	channels.push(channel);
	await tournament.save();
}

export async function removeAnnouncementChannel(
	channel: DiscordID,
	challongeId: TournamentID,
	host: DiscordID,
	kind: "public" | "private" = "public"
): Promise<boolean> {
	const tournament = await getAuthorizedTournament(challongeId, host);
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
export async function isOrganising(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	return tournament.hosts.includes(host);
}

export async function addHost(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	if (tournament.hosts.includes(host)) {
		return false;
	}
	tournament.hosts.push(host);
	await tournament.save();
	return true;
}

export async function removeHost(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
	const tournament = await findTournament(challongeId);
	if (tournament.hosts.length < 2 || !tournament.hosts.includes(host)) {
		return false;
	}
	const i = tournament.hosts.indexOf(host);
	// i < 0 is impossible by precondition
	tournament.hosts.splice(i, 1);
	await tournament.save();
	return true;
}

export async function findTournamentByRegisterMessage(
	message: DiscordID,
	channel: DiscordID
): Promise<TournamentDoc | null> {
	return await TournamentModel.findOne({
		"registerMessages.channel": channel,
		"registerMessages.message": message
	});
}

// Invoke after a registration message has been sent to an announcement channel.
export async function addRegisterMessage(
	message: DiscordID,
	channel: DiscordID,
	challongeId: TournamentID
): Promise<void> {
	const tournament = await findTournament(challongeId);
	tournament.registerMessages.push({ message, channel });
	await tournament.save();
}

// Invoke after a registration message gets deleted.
export async function removeRegisterMessage(message: DiscordID, channel: DiscordID): Promise<boolean> {
	const tournament = await findTournamentByRegisterMessage(message, channel);
	if (!tournament) {
		return false;
	}
	const i = tournament.registerMessages.indexOf({ message, channel });
	// i < 0 is impossible by precondition
	tournament.registerMessages.splice(i, 1); // consider $pullAll
	await tournament.save();
	return true;
}

// Invoke after a user requests to join a tournament and the appropriate response is delivered.
export async function addPendingParticipant(message: DiscordID, channel: DiscordID, user: DiscordID): Promise<boolean> {
	const tournament = await findTournamentByRegisterMessage(message, channel);
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
	message: DiscordID,
	channel: DiscordID,
	user: DiscordID
): Promise<boolean> {
	const tournament = await TournamentModel.findOne({
		"registerMessages.channel": channel,
		"registerMessages.message": message,
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
export async function startTournament(challongeId: TournamentID, host: DiscordID, rounds: number): Promise<string[]> {
	const tournament = await getAuthorizedTournament(challongeId, host);
	const removedIDs = tournament.pendingParticipants.slice(); // clone values
	tournament.pendingParticipants = [];
	tournament.status = "in progress";
	tournament.currentRound = 1;
	tournament.totalRounds = rounds;
	await tournament.save();
	return removedIDs;
}

// Progresses tournament to the next round or returns -1 if it was already the final round
export async function nextRound(challongeId: TournamentID, host: DiscordID): Promise<number> {
	const tournament = await getAuthorizedTournament(challongeId, host);
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
export async function finishTournament(challongeId: TournamentID, host: DiscordID): Promise<void> {
	const tournament = await getAuthorizedTournament(challongeId, host);
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

export async function setTournamentName(challongeId: string, name: string): Promise<string> {
	const old = await TournamentModel.findOneAndUpdate({ challongeId }, { name });
	if (!old) {
		throw new TournamentNotFoundError(challongeId);
	}
	return old.name;
}

export async function setTournamentDescription(challongeId: string, description: string): Promise<string> {
	const old = await TournamentModel.findOneAndUpdate({ challongeId }, { description });
	if (!old) {
		throw new TournamentNotFoundError(challongeId);
	}
	return old.description;
}

interface MongoPlayer {
	challongeId: number;
	discord: string;
	deck: {
		main: number[];
		extra: number[];
		side: number[];
	};
}

export async function getPlayerFromId(challongeId: TournamentID, playerId: number): Promise<MongoPlayer | undefined> {
	const tournament = await findTournament(challongeId);
	return tournament.confirmedParticipants.find(p => p.challongeId === playerId);
}

export async function getPlayerFromDiscord(
	challongeId: TournamentID,
	discordId: DiscordID
): Promise<MongoPlayer | undefined> {
	const tournament = await findTournament(challongeId);
	return tournament.confirmedParticipants.find(p => p.discord === discordId);
}

// Get persisted tournaments that are not finished, for restoration upon launch
export async function getOngoingTournaments(): Promise<TournamentDoc[]> {
	return await TournamentModel.find({ $or: [{ status: "in progress" }, { status: "preparing" }] });
}
