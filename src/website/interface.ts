export interface WebsiteWrapper {
	createTournament(name: string, desc: string): Promise<WebsiteTournament>;
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void>;
	getTournament(tournamentId: string): Promise<WebsiteTournament>;
	registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number>;
	startTournament(tournamentId: string): Promise<void>;
	getMatches(tournamentId: string): Promise<WebsiteMatch[]>;
	getMatchWithPlayer(tournamentId: string, playerId: number): Promise<WebsiteMatch>;
	removePlayer(tournamentId: string, playerId: number): Promise<void>;
	submitScore(tournamentId: string, winner: number, winnerScore: number, loserScore: number): Promise<void>;
}

interface WebsitePlayer {
	challongeId: number;
	discordId: string;
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

	public async createTournament(name: string, desc: string): Promise<WebsiteTournament> {
		return await this.api.createTournament(name, desc);
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
}
