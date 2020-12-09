import { UnauthorisedHostError, UnauthorisedPlayerError } from "./errors";

export async function authenticateHost(tournamentId: string, hostId: string): Promise<void> {
	throw new UnauthorisedHostError(hostId, tournamentId);
}

export async function authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
	throw new UnauthorisedPlayerError(playerId, tournamentId);
}

export async function createTournament(name: string, desc: string): Promise<[string, string]> {
	throw new Error("Not implemented!");
}
export async function updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
	throw new Error("Not implemented!");
}
export async function addAnnouncementChannel(
	tournamentId: string,
	channel: string,
	type: "public" | "private"
): Promise<void> {
	throw new Error("Not implemented!");
}

export async function removeAnnouncementChannel(
	tournamentId: string,
	channel: string,
	type: "public" | "private"
): Promise<void> {
	throw new Error("Not implemented!");
}

export async function addHost(tournamentId: string, newHost: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function removeHost(tournamentId: string, newHost: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function openTournament(tournamentId: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function startTournament(tournamentId: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function cancelTournament(tournamentId: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function submitScore(
	tournamentId: string,
	playerId: string,
	scorePlayer: number,
	scoreOpp: number
): Promise<void> {
	throw new Error("Not implemented!");
}
