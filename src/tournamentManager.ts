import { UnauthorisedHostError } from "./errors";

export async function authenticateHost(tournamentId: string, hostId: string): Promise<void> {
	throw new UnauthorisedHostError(hostId, tournamentId);
}
export async function createTournament(name: string, desc: string): Promise<[string, string]> {
	throw new Error("Not implemented!");
}
export async function updateTournament(id: string, name: string, desc: string): Promise<void> {
	throw new Error("Not implemented!");
}
