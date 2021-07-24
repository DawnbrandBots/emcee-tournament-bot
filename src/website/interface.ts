import { ChallongeIDConflictError, UserError } from "../util/errors";
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
			if (e.message === "URL is already taken") {
				throw new ChallongeIDConflictError(url);
			}
			throw e;
		}
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		return await this.api.updateTournament(tournamentId, name, desc);
	}

	public async updateTieBreakers(tournamentId: string, tbs: ChallongeTieBreaker[]): Promise<void> {
		return await this.api.updateTieBreakers(tournamentId, tbs);
	}

	public async getTournament(tournamentId: string): Promise<WebsiteTournament> {
		return await this.api.getTournament(tournamentId);
	}

	public async registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		return await this.api.registerPlayer(tournamentId, playerName, playerId);
	}

	public async startTournament(tournamentId: string): Promise<void> {
		await this.api.startTournament(tournamentId);
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

	public async getPlayers(tournamentId: string): Promise<WebsitePlayer[]> {
		return await this.api.getPlayers(tournamentId);
	}

	public async removePlayer(tournamentId: string, playerId: number): Promise<void> {
		await this.api.removePlayer(tournamentId, playerId);
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

	private async setSeed(tournamentId: string, playerId: number, seed: number): Promise<void> {
		await this.api.setSeed(tournamentId, playerId, seed);
	}

	public async assignByes(tournamentId: string, inPlayersToBye: string[]): Promise<void> {
		const playersToBye = inPlayersToBye.slice(0); // shallow copy to sever reference for when we pop
		if (playersToBye.length < 1) {
			return;
		}

		const playerArray = await this.api.getPlayers(tournamentId);
		const players = new Map(playerArray.map(p => [p.discordId, p]));

		// sort players with byes by their seed so that their paths don't cross when we change their seed
		playersToBye.sort((a, b) => (players.get(a)?.seed || 0) - (players.get(b)?.seed || 0));

		// detailed logging
		/*logger.verbose(
			JSON.stringify({
				tournament: tournamentId,
				command: "assignByes",
				event: "before",
				players: players.map(p => {
					return { discord: p.discordId, challonge: p.challongeId, seed: p.seed };
				}),
				byes: inPlayersToBye
			})
		);*/

		const numPlayers = players.size;
		const numToBye = playersToBye.length;
		/* With 1 bye left to distribute, if the current number of players is even, we need to add another player
		   This will have the consequence later of a floating natural bye we want to assign to a player not involved with byes
		   If the current number of players is odd, we have the natural bye to use and can assign it to a player with a bye
		   So in that case, we don't want to add that last player.
		   The current number of players with 1 bye left is N + B - 1, which has opposite parity to N + B.
		   Hence if N + B is even, we don't have to add the last player, and if it's odd, we need to handle the natural bye later. */
		const isSumEven = (numPlayers + numToBye) % 2 === 0;
		const numByes = numToBye - (isSumEven ? 1 : 0);
		const byePlayers = [];
		for (let i = 0; i < numByes; i++) {
			byePlayers.push(await this.registerPlayer(tournamentId, `Round 1 Bye #${i + 1}`, `BYE${i}`));
		}

		const maxSeed = numPlayers + numByes; // This value is always odd due to the N + B maths above.
		// Here we assign the natural bye to an appropriate player if we can.
		if (isSumEven) {
			// we've checked the length is >0 so pop can't return undefiend
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const lastPlayerDiscord = playersToBye.pop()!; // modifying this array won't have long-term consequences on the database
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const lastPlayer = players.get(lastPlayerDiscord)!;
			await this.setSeed(tournamentId, lastPlayer.challongeId, maxSeed);
			// this may have been the only bye, in which case we're mercifully done
			if (playersToBye.length < 1) {
				return;
			}
		}

		// ensure all human players are in top half of the list, which after will remain constant
		const topSeeds = [];
		for (let i = 0; i < playersToBye.length; i++) {
			/* We assign to the low end of the top half to minimise an unfair boost to tiebreakers,
			   but assign from top to bottom to ensure they don't push each other into the bottom half.
			   We floor because we always want the algorithm to ignore the odd max seed.
			   If N + B is odd we've put something there, and if N + B is even we want something to be left there. */
			const newSeed = Math.floor(maxSeed / 2) - playersToBye.length + i + 1;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const player = players.get(playersToBye[i])!;
			let seed = player.seed;
			// no need to disturb their seed if they're already in place
			if (seed > newSeed) {
				await this.setSeed(tournamentId, player.challongeId, newSeed);
				seed = newSeed;
			}
			topSeeds.push(seed);
		}

		// should be same as number of byePlayers, given that if N + B even we've knocked one out of that array
		for (let i = 0; i < topSeeds.length; i++) {
			/* Since the topSeeds are all in the top half, we know adding half the max will stay in bounds.
			   We set the seeds from top to bottom since we're moving from the bottom,
			   this means they won't disturb anything above where they land.
			   This is only true because we sorted the players by seed initially.
			   Things below where they land are either going to be moved themselves or don't matter.
			   In particular, if N + B is even we want something to be moved down to the natural bye. */
			const oppSeed = topSeeds[i] + Math.floor(maxSeed / 2);
			// we've set discord IDs to this
			await this.setSeed(tournamentId, byePlayers[i], oppSeed);
		}

		// detailed logging
		// update array after challonge changes. REMOVE AFTER LOGS NOT NEEDED
		/*const newPlayers = await this.api.getPlayers(tournamentId);
		logger.verbose(
			JSON.stringify({
				tournament: tournamentId,
				command: "assignByes",
				event: "after",
				players: newPlayers.map(p => {
					return { discord: p.discordId, challonge: p.challongeId, seed: p.seed };
				}),
				byes: inPlayersToBye
			})
		);*/
	}

	public async dropByes(tournamentId: string, numByes: number): Promise<void> {
		const players = await this.api.getPlayers(tournamentId);
		for (let i = 0; i < numByes; i++) {
			const player = players.find(p => p.discordId === `BYE${i}`);
			/* One would think we could assert non-null here because we made these players,
			   However, if N + B even (see above comments), BYE${numByes} won't exist,
			   and this is simpler than calculating that again.
			   This also neatly handles edge cases like a bye player being manually dropped. */
			if (player) {
				const match = await this.findMatch(tournamentId, player.challongeId);
				/* We assume the match will exist and be open since the tournament just started
				   But checking handles edge cases like a human theoretically changing the score before Emcee can
				   Considering how slow the startTournament function is, that's not impossible */
				if (match) {
					const winner = match.player1 === player.challongeId ? match.player2 : match.player1;
					await this.api.submitScore(tournamentId, match, winner, 2, 0);
				}
				await this.removePlayer(tournamentId, player.challongeId);
			}
		}
	}

	public async getPlayer(...args: Parameters<WebsiteWrapper["getPlayer"]>): ReturnType<WebsiteWrapper["getPlayer"]> {
		return await this.api.getPlayer(...args);
	}

	public async shufflePlayers(tournamentId: string): Promise<void> {
		await this.api.shufflePlayers(tournamentId);
	}
}
