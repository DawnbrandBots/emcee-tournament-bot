import { WebsiteMatch, WebsitePlayer, WebsiteTournament, WebsiteWrapper } from "../../src/website/interface";

export class WebsiteWrapperMock implements WebsiteWrapper {
	async createTournament(name: string, desc: string, url: string): Promise<WebsiteTournament> {
		return {
			id: url,
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
	async registerPlayer(): Promise<number> {
		return 1; // challongeId won't matter lol
	}
	async startTournament(): Promise<void> {
		return;
	}
	async getMatches(): Promise<WebsiteMatch[]> {
		return [];
	}
	async getMatchWithPlayer(): Promise<WebsiteMatch> {
		return {
			player1: 1,
			player2: 2,
			matchId: 0
		};
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
	async getPlayers(): Promise<WebsitePlayer[]> {
		return [
			{
				challongeId: 1,
				discordId: "player1",
				rank: -1,
				seed: 1
			}
		];
	}
	async setSeed(): Promise<void> {
		return;
	}
}
