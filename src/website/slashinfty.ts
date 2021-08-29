import { EventManager } from "tournament-organizer";
import { ChallongeTieBreaker, WebsiteMatch, WebsitePlayer, WebsiteTournament, WebsiteWrapper } from "./interface";

export class WebsiteWrapperSlashinfty implements WebsiteWrapper {
	private readonly manager = new EventManager();

	async createTournament(name: string, desc: string, url: string, topCut?: boolean): Promise<WebsiteTournament> {
		this.manager.createTournament(url, {
			name,
			format: topCut ? "elim" : "swiss",
			bestOf: 3
		});
		return {
			id: url,
			name,
			desc,
			url: `slashinfty://${url}`,
			players: [],
			rounds: NaN,
			tieBreaks: []
		};
	}
	async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		void tournamentId, name, desc;
	}
	async updateTieBreakers(tournamentId: string, tbs: ChallongeTieBreaker[]): Promise<void> {
		void tournamentId, tbs;
	}
	async getTournament(tournamentId: string): Promise<WebsiteTournament> {
		const tournament = this.manager.tournaments.find(tournament => tournament.eventID === tournamentId);
		if (tournament) {
			throw new Error();
		} else {
			throw new Error();
		}
	}
	async registerPlayer(tournamentId: string, playerName: string, playerId: string): Promise<number> {
		const tournament = this.manager.tournaments.find(tournament => tournament.eventID === tournamentId);
		tournament?.addPlayer(playerName, playerId);
		return 0;
	}
	async startTournament(tournamentId: string): Promise<void> {
		this.manager.tournaments.find(tournament => tournament.eventID === tournamentId)?.startEvent();
	}
	async getMatches(tournamentId: string, open?: boolean, playerId?: number): Promise<WebsiteMatch[]> {
		return this.manager.tournaments.find(tournament => tournament.eventID === tournamentId)?.activeMatches();
	}
	async removePlayer(tournamentId: string, playerId: number): Promise<void> {
		this.manager.tournaments.find(tournament => tournament.eventID === tournamentId)?.removePlayer(playerId);
	}
	async submitScore(
		tournamentId: string,
		match: WebsiteMatch,
		winner: number,
		winnerScore: number,
		loserScore: number
	): Promise<void> {
		this.manager.tournaments.find(tournament => tournament.eventID === tournamentId)?.result();
		throw new Error("Method not implemented.");
	}
	async finishTournament(tournamentId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async getPlayers(tournamentId: string): Promise<WebsitePlayer[]> {
		throw new Error("Method not implemented.");
	}
	async setSeed(tournamentId: string, playerId: number, newSeed: number): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async getPlayer(tournamentId: string, playerId: number): Promise<WebsitePlayer> {
		throw new Error("Method not implemented.");
	}
	async shufflePlayers(tournamentId: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
}
