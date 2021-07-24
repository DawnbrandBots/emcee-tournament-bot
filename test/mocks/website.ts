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
			rounds: 3,
			tieBreaks: ["median buchholz", "points difference", "match wins vs tied"]
		};
	}
	async updateTournament(): Promise<void> {
		return;
	}
	async updateTieBreakers(): Promise<void> {
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
						active: true,
						seed: 1,
						discordId: "bye"
					}
				],
				rounds: 3,
				tieBreaks: ["median buchholz", "points difference", "match wins vs tied"]
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
			rounds: 3,
			tieBreaks: ["median buchholz", "points difference", "match wins vs tied"]
		};
	}
	async registerPlayer(): Promise<number> {
		return 1; // challongeId won't matter lol
	}
	async startTournament(): Promise<void> {
		return;
	}
	async getMatches(tournamentId: string): Promise<WebsiteMatch[]> {
		if (tournamentId === "bye") {
			return [];
		}
		return [
			{
				player1: 1,
				player2: 2,
				matchId: 0,
				open: true,
				round: 1
			}
		];
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
					active: true,
					rank: 1,
					seed: 1
				},
				{
					challongeId: 2,
					discordId: "b",
					active: true,
					rank: 2,
					seed: 2
				},
				{
					challongeId: 3,
					discordId: "c",
					active: true,
					rank: 3,
					seed: 3
				},
				{
					challongeId: 4,
					discordId: "d",
					active: true,
					rank: 4,
					seed: 4
				},
				{
					challongeId: 5,
					discordId: "e",
					active: true,
					rank: 5,
					seed: 5
				},
				{
					challongeId: 6,
					discordId: "f",
					active: true,
					rank: 6,
					seed: 6
				},
				{
					challongeId: 7,
					discordId: "g",
					active: true,
					rank: 7,
					seed: 7
				},
				{
					challongeId: 8,
					discordId: "h",
					active: true,
					rank: 8,
					seed: 8
				},
				{
					challongeId: 9,
					discordId: "i",
					active: true,
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
					active: true,
					rank: -1,
					seed: 1
				},
				{
					challongeId: 2,
					discordId: "dummy0",
					active: true,
					rank: -1,
					seed: 2
				}
			];
		}
		return [
			{
				challongeId: 1,
				discordId: "player1",
				active: true,
				rank: -1,
				seed: 1
			}
		];
	}
	async setSeed(): Promise<void> {
		return;
	}
	async getPlayer(): Promise<WebsitePlayer> {
		throw new Error("Not implemented");
	}
	async shufflePlayers(): Promise<void> {
		return;
	}
}
