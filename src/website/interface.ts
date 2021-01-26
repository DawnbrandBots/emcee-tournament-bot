import { ChallongeIDConflictError } from "../util/errors";

export interface WebsiteWrapper {
	createTournament(name: string, desc: string, url: string, topCut?: boolean): Promise<WebsiteTournament>;
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void>;
	getTournament(tournamentId: string): Promise<WebsiteTournament>;
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number>;
	startTournament(tournamentId: string): Promise<void>;
	getMatches(tournamentId: string): Promise<WebsiteMatch[]>;
	getMatchWithPlayer(tournamentId: string, playerId: number): Promise<WebsiteMatch>;
	removePlayer(tournamentId: string, playerId: number): Promise<void>;
	submitScore(tournamentId: string, winner: number, winnerScore: number, loserScore: number): Promise<void>;
	finishTournament(tournamentId: string): Promise<void>;
	getPlayers(tournamentId: string): Promise<WebsitePlayer[]>;
	setSeed(tournamentId: string, playerId: number, newSeed: number): Promise<void>;
}

export interface WebsitePlayer {
	challongeId: number;
	discordId: string;
	active: boolean; // !dropped
	rank: number;
	seed: number;
}

// interface structure WIP as fleshed out command-by-command
export interface WebsiteTournament {
	id: string;
	name: string;
	desc: string;
	url: string;
	players: WebsitePlayer[];
	rounds: number;
}

export interface WebsiteMatch {
	player1: number;
	player2: number;
	matchId: number;
}

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

	public async getTournament(tournamentId: string): Promise<WebsiteTournament> {
		return await this.api.getTournament(tournamentId);
	}

	public async registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		return await this.api.registerPlayer(tournamentId, playerName, playerId);
	}

	public async startTournament(tournamentId: string): Promise<void> {
		await this.api.startTournament(tournamentId);
	}

	public async getBye(tournamentId: string): Promise<string | undefined> {
		const tournament = await this.getTournament(tournamentId);
		// do not count dropped players
		const activePlayers = tournament.players.filter(p => p.active);
		if (activePlayers.length % 2 === 0) {
			// even number of players means no bye
			return undefined;
		}
		const matches = await this.api.getMatches(tournamentId);
		// Find a player for which the following is true
		const bye = activePlayers.find(p => {
			// Find a match which includes the player
			const match = matches.find(m => m.player1 === p.challongeId || m.player2 === p.challongeId);
			// Negate: if we found a match, this player doesn't have the bye.
			return !match;
		});
		// This finds a player not in any match - i.e., they have the bye
		return bye?.discordId;
	}

	public async getMatches(tournamentId: string): Promise<WebsiteMatch[]> {
		return await this.api.getMatches(tournamentId);
	}

	public async findMatch(tournamentId: string, playerId: number): Promise<WebsiteMatch | undefined> {
		return await this.api.getMatchWithPlayer(tournamentId, playerId);
	}

	public async getPlayers(tournamentId: string): Promise<WebsitePlayer[]> {
		return await this.api.getPlayers(tournamentId);
	}

	public async removePlayer(tournamentId: string, playerId: number): Promise<void> {
		await this.api.removePlayer(tournamentId, playerId);
	}

	public async submitScore(
		tournamentId: string,
		winner: number,
		winnerScore: number,
		loserScore: number
	): Promise<void> {
		await this.api.submitScore(tournamentId, winner, winnerScore, loserScore);
	}

	public async finishTournament(tournamentId: string): Promise<WebsiteTournament> {
		const tournament = await this.api.getTournament(tournamentId);
		await this.api.finishTournament(tournamentId);
		return tournament;
	}

	public async getTopCut(tournamentId: string, cut = 8): Promise<WebsitePlayer[]> {
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

		const players = await this.api.getPlayers(tournamentId);
		const numPlayers = players.length;
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
			const lastPlayer = players.find(p => p.discordId === lastPlayerDiscord)!;
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
			const player = players.find(p => p.discordId === playersToBye[i])!;
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
			   Things below where they land are either going to be moved themselves or don't matter.
			   In particular, if N + B is even we want something to be moved down to the natural bye. */
			const oppSeed = topSeeds[i] + Math.floor(maxSeed / 2);
			// we've set discord IDs to this
			await this.setSeed(tournamentId, byePlayers[i], oppSeed);
		}
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
				const match = await this.api.getMatchWithPlayer(tournamentId, player.challongeId);
				const winner = match.player1 === player.challongeId ? match.player2 : match.player1;
				await this.api.submitScore(tournamentId, winner, 2, 0);
				await this.removePlayer(tournamentId, player.challongeId);
			}
		}
	}
}
