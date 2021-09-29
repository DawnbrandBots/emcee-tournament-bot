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

	// this can also find open matches, but uses a weighter query to include closed matches
	public async findClosedMatch(tournamentId: string, playerId: number): Promise<WebsiteMatch | undefined> {
		// don't filter for open so we can submit to closed
		// don't filter for player so we can get correct round no.
		const matches = await this.api.getMatches(tournamentId, false);
		// get round number from first open round
		const round = matches.filter(m => m.open)[0].round;
		const match = matches.find(m => m.round === round && (m.player1 === playerId || m.player2 === playerId));
		if (!match) {
			// may have the bye
			throw new UserError(
				`Could not find a match with Player ${playerId} in Tournament ${tournamentId}, Round ${round}!`
			);
		}
		return match;
	}
}
