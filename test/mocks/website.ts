import { WebsiteMatch, WebsiteTournament, WebsiteWrapper } from "../../src/website/interface";

export class WebsiteWrapperMock implements WebsiteWrapper {
	createTournament(name: string, desc: string, url: string): Promise<WebsiteTournament> {
		throw new Error("Not yet implemented!");
	}
	async updateTournament(): Promise<void> {
		return;
	}
	getTournament(tournamentId: string): Promise<WebsiteTournament> {
		throw new Error("Not yet implemented!");
	}
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		throw new Error("Not yet implemented!");
	}
	async startTournament(): Promise<void> {
		return;
	}
	getMatches(tournamentId: string): Promise<WebsiteMatch[]> {
		throw new Error("Not yet implemented!");
	}
	getMatchWithPlayer(tournamentId: string, playerId: number): Promise<WebsiteMatch> {
		throw new Error("Not yet implemented!");
	}
	async removePlayer(): Promise<void> {
		return;
	}
	async submitScore(): Promise<void> {
		return;
	}
	async finishTournament(): Promise<void> {
		return;
	}
}
