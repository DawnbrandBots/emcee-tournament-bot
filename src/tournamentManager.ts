import { Deck } from "ydeck";
import { dummyDb } from "./databaseGeneric";
import logger from "./logger";
import { dummyWebsite } from "./websiteGeneric";

export async function authenticateHost(tournamentId: string, hostId: string): Promise<void> {
	await dummyDb.authenticateHost(tournamentId, hostId);
}

export async function authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
	await dummyDb.authenticatePlayer(tournamentId, playerId);
}

export async function listTournaments(): Promise<string> {
	throw new Error("Not yet implemented!");
}

export async function createTournament(name: string, desc: string): Promise<[string, string]> {
	const web = await dummyWebsite.createTournament(name, desc);
	await dummyDb.createTournament(web);
	// TODO: Worth passing user ID just for logging? Log in commands instead?
	logger.verbose(`New tournament created ${web.id}.`);
	return [web.id, web.url];
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

export async function nextRound(tournamentId: string): Promise<number> {
	throw new Error("Not implemented!");
}

export async function listPlayers(tournamentId: string): Promise<string> {
	throw new Error("Not implemented!");
}

export async function getPlayerDeck(tournamentId: string, playerId: string): Promise<Deck> {
	throw new Error("Not implemented!");
}

export async function dropPlayer(tournamentId: string, playerId: string): Promise<void> {
	throw new Error("Not implemented!");
}

export async function syncTournament(tournamentId: string): Promise<void> {
	throw new Error("Not implemented!");
}
