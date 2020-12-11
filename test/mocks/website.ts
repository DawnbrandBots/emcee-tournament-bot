import { WebsiteMatch, WebsiteTournament, WebsiteWrapper } from "../../src/website/interface";

export class WebsiteWrapperMock implements WebsiteWrapper {
	createTournament(name: string, desc: string, url: string): Promise<WebsiteTournament> {
		throw new Error("Not yet implemented!");
	}
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	getTournament(tournamentId: string): Promise<WebsiteTournament> {
		throw new Error("Not yet implemented!");
	}
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		throw new Error("Not yet implemented!");
	}
	startTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	getMatches(tournamentId: string): Promise<WebsiteMatch[]> {
		throw new Error("Not yet implemented!");
	}
	getMatchWithPlayer(tournamentId: string, playerId: number): Promise<WebsiteMatch> {
		throw new Error("Not yet implemented!");
	}
	removePlayer(tournamentId: string, playerId: number): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	submitScore(tournamentId: string, winner: number, winnerScore: number, loserScore: number): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	finishTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
}
