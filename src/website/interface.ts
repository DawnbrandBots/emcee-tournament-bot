import { ChallongeAPIError, ChallongeIDConflictError, UserError } from "../util/errors";
// import { getLogger } from "../util/logger";

export interface WebsiteWrapper {
	createTournament(name: string, desc: string, url: string, topCut?: boolean): Promise<WebsiteTournament>;
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void>;
	updateTieBreakers(tournamentId: string, tbs: ChallongeTieBreaker[]): Promise<void>;
	getTournament(tournamentId: string): Promise<WebsiteTournament>;
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number>;
	startTournament(tournamentId: string): Promise<void>;
	getMatches(tournamentId: string, open?: boolean, playerId?: number): Promise<WebsiteMatch[]>;
	removePlayer(tournamentId: string, playerId: number): Promise<void>;
	submitScore(
		tournamentId: string,
		match: WebsiteMatch,
		winner: number,
		winnerScore: number,
		loserScore: number
	): Promise<void>;
	finishTournament(tournamentId: string): Promise<void>;
	getPlayers(tournamentId: string): Promise<WebsitePlayer[]>;
	setSeed(tournamentId: string, playerId: number, newSeed: number): Promise<void>;
	getPlayer(tournamentId: string, playerId: number): Promise<WebsitePlayer>;
	shufflePlayers(tournamentId: string): Promise<void>;
}

export interface WebsitePlayer {
	challongeId: number;
	discordId: string;
	active: boolean; // !dropped
	rank: number;
	seed: number;
}

export type ChallongeTieBreaker =
	| "match wins"
	| "game wins"
	| "game win percentage"
	| "points scored"
	| "points difference"
	| "match wins vs tied"
	| "median buchholz";

// interface structure WIP as fleshed out command-by-command
export interface WebsiteTournament {
	id: string;
	name: string;
	desc: string;
	url: string;
	players: WebsitePlayer[];
	rounds: number;
	tieBreaks: ChallongeTieBreaker[];
}

export interface WebsiteMatch {
	player1: number;
	player2: number;
	matchId: number;
	open: boolean;
	round: number;
}

// const logger = getLogger("website");

export class WebsiteInterface {
	constructor(private api: WebsiteWrapper) {}

	public async createTournament(name: string, desc: string, url: string, topCut = false): Promise<WebsiteTournament> {
		try {
			return await this.api.createTournament(name, desc, url, topCut);
		} catch (e) {
			// challonge API error message
			if (e instanceof ChallongeAPIError && e.message === "URL is already taken") {
				throw new ChallongeIDConflictError(url);
			}
			throw e;
		}
	}

	// public interface is expected to get open matches
	public async getMatches(tournamentId: string): Promise<WebsiteMatch[]> {
		return await this.api.getMatches(tournamentId, true);
	}

	public async findMatch(tournamentId: string, playerId: number): Promise<WebsiteMatch | undefined> {
		// an open match will be in the current round
		const matches = await this.api.getMatches(tournamentId, true, playerId);
		if (matches.length > 0) {
			return matches[0];
		}
	}

	// this can also find open matches, but uses a weighter query to include closed matches
	public async findClosedMatch(tournamentId: string, playerId: number): Promise<WebsiteMatch | undefined> {
		// don't filter for open so we can submit to closed
		// don't filter for player so we can get correct round no.
		const matches = await this.api.getMatches(tournamentId, false);
		// filter open matches to get round no.
		const openMatches = matches.filter(m => m.open);
		// passing an array of matches skips the excessive call
		const round = await this.getRound(tournamentId, openMatches);
		const match = matches.find(m => m.round === round && (m.player1 === playerId || m.player2 === playerId));
		if (!match) {
			// may have the bye
			throw new UserError(
				`Could not find a match with Player ${playerId} in Tournament ${tournamentId}, Round ${round}!`
			);
		}
		return match;
	}

	public async getRound(tournamentId: string, cachedMatches?: WebsiteMatch[]): Promise<number> {
		const matches = cachedMatches || (await this.api.getMatches(tournamentId, true));
		if (matches.length < 1) {
			throw new UserError(
				`No matches found for Tournament ${tournamentId}! This likely means the tournament either has not started or is finished!`
			);
		}
		// All open matches should have the same round in Swiss. In Elim, we expect the array to be sorted by age and the lowest round should be the current.
		return matches[0].round;
	}

	public async submitScore(
		tournamentId: string,
		match: WebsiteMatch,
		winner: number,
		winnerScore: number,
		loserScore: number
	): Promise<void> {
		await this.api.submitScore(tournamentId, match, winner, winnerScore, loserScore);
	}

	public async finishTournament(tournamentId: string): Promise<WebsiteTournament> {
		const tournament = await this.api.getTournament(tournamentId);
		await this.api.finishTournament(tournamentId);
		return tournament;
	}

	public async getTopCut(tournamentId: string, cut: number): Promise<WebsitePlayer[]> {
		const players = await this.api.getPlayers(tournamentId);
		return players.sort((p1, p2) => p1.rank - p2.rank).slice(0, cut); // descending order
	}
}
