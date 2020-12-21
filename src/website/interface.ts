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
	private api: WebsiteWrapper;
	constructor(api: WebsiteWrapper) {
		this.api = api;
	}

	public async createTournament(name: string, desc: string, url: string, topCut = false): Promise<WebsiteTournament> {
		return await this.api.createTournament(name, desc, url, topCut);
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
		if (tournament.players.length % 2 === 0) {
			// even number of players means no bye
			return undefined;
		}
		const matches = await this.api.getMatches(tournamentId);
		const bye = tournament.players.find(
			p => !matches.find(m => m.player1 !== p.challongeId && m.player2 !== p.challongeId)
		);
		return bye?.discordId;
	}

	public async findMatch(tournamentId: string, playerId: number): Promise<WebsiteMatch | undefined> {
		return await this.api.getMatchWithPlayer(tournamentId, playerId);
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
		return players.sort((p1, p2) => p2.rank - p1.rank).slice(0, cut); // descending order
	}

	private async setSeed(tournamentId: string, playerId: number, seed: number): Promise<void> {
		await this.api.setSeed(tournamentId, playerId, seed);
	}

	public async assignByes(tournamentId: string, numPlayers: number, playersToBye: string[]): Promise<void> {
		if (playersToBye.length < 1) {
			return;
		}

		// Add bye dummy players and rearrange seeds
		const numByes = playersToBye.length - (numPlayers % 2); // if odd no. of players, 1 can get the natural bye
		const byePlayers = [];
		for (let i = 0; i < numByes; i++) {
			byePlayers.push(await this.registerPlayer(tournamentId, `Round 1 Bye #${i + 1}`, `DUMMY${i}`));
		}
		const maxSeed = numPlayers + numByes; // new no. of players
		const players = await this.api.getPlayers(tournamentId);
		// assign natural bye
		if (numPlayers % 2 === 1) {
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
			// assign to low end of top half to minimise unfair boost to tiebreakers,
			// but assign from top to bottom to ensure they don't push each other into bottom half
			const newSeed = Math.floor(maxSeed / 2) - playersToBye.length + i;
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

		// should be same as number of byePlayers
		for (let i = 0; i < topSeeds.length; i++) {
			// since topSeeds are all in the top half, no modulus needed
			// set from top to bottom since moving from the bottom
			// means they won't disturb anything above where they land
			const oppSeed = topSeeds[i] + Math.floor(maxSeed / 2);
			// we've set discord IDs to this
			await this.setSeed(tournamentId, byePlayers[i], oppSeed);
		}
	}

	public async dropByes(tournamentId: string, numByes: number): Promise<void> {
		const players = await this.api.getPlayers(tournamentId);
		for (let i = 0; i < numByes; i++) {
			const player = players.find(p => p.discordId === `DUMMY${i}`);
			// could assert non-null here cuz we made these players
			// but this is simple enough and handles them being manually dropped
			if (player) {
				const match = await this.api.getMatchWithPlayer(tournamentId, player.challongeId);
				const winner = match.player1 === player.challongeId ? match.player2 : match.player1;
				await this.api.submitScore(tournamentId, winner, 2, 0);
				await this.removePlayer(tournamentId, player.challongeId);
			}
		}
	}
}
