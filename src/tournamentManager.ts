import { UnauthorisedHostError } from "./errors";

export async function authenticateHost(tournamentId: string, hostId: string): Promise<void> {
	throw new UnauthorisedHostError(hostId, tournamentId);
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
