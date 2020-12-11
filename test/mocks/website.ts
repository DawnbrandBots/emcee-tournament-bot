import { WebsiteMatch, WebsiteTournament, WebsiteWrapper } from "../../src/website/interface";

export class WebsiteWrapperMock implements WebsiteWrapper {
	async createTournament(name: string, desc: string, url: string): Promise<WebsiteTournament> {
		return {
			id: `mc_${name}`,
			name: name,
			desc: desc,
			url: `https://example.com/${url}`,
			players: [],
			rounds: 3
		};
	}
	async updateTournament(): Promise<void> {
		return;
	}
	async getTournament(tournamentId: string): Promise<WebsiteTournament> {
		return {
			id: tournamentId,
			name: "name",
			desc: "desc",
			url: "https://example.com/url",
			players: [],
			rounds: 3
		};
	}
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		throw new Error("Not yet implemented!");
	}
	async startTournament(): Promise<void> {
		return;
	}
	async getMatches(): Promise<WebsiteMatch[]> {
		return [];
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
