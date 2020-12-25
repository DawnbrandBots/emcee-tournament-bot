import { ChallongeAPIError } from "../../src/util/errors";
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
		if (tournamentId === "bye") {
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
		if (tournamentId.includes("create") || tournamentId.includes("topcut")) {
			throw new ChallongeAPIError("URL not found.");
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
		if (tournamentId === "bigTournament") {
			return [
				{
					challongeId: 1,
					discordId: "a",
					rank: 1,
					seed: 1
				},
				{
					challongeId: 2,
					discordId: "b",
					rank: 2,
					seed: 2
				},
				{
					challongeId: 3,
					discordId: "c",
					rank: 3,
					seed: 3
				},
				{
					challongeId: 4,
					discordId: "d",
					rank: 4,
					seed: 4
				},
				{
					challongeId: 5,
					discordId: "e",
					rank: 5,
					seed: 5
				},
				{
					challongeId: 6,
					discordId: "f",
					rank: 6,
					seed: 6
				},
				{
					challongeId: 7,
					discordId: "g",
					rank: 7,
					seed: 7
				},
				{
					challongeId: 8,
					discordId: "h",
					rank: 8,
					seed: 8
				},
				{
					challongeId: 9,
					discordId: "i",
					rank: 9,
					seed: 9
				}
			];
		}
		if (tournamentId === "dummy") {
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
