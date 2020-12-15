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
		if (tournamentId === "mc_bye") {
			return {
				id: tournamentId,
				name: "name",
				desc: "desc",
				url: `https://example.com/url`,
				players: [
					{
						challongeId: 1,
						rank: -1,
						seed: 1,
						discordId: "bye"
					}
				],
				rounds: 3
			};
		}
		return {
			id: tournamentId,
			name: "name",
			desc: "desc",
			url: `https://example.com/url`,
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
	async getPlayers(tournamentId: string): Promise<WebsitePlayer[]> {
		if (tournamentId === "mc_dummy") {
			return [
				{
					challongeId: 1,
					discordId: "player1",
					rank: -1,
					seed: 1
				},
				{
					challongeId: 2,
					discordId: "dummy0",
					rank: -1,
					seed: 2
				}
			];
		}
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
