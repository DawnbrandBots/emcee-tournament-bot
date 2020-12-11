import { Deck } from "ydeck";
import {
	DiscordAttachmentOut,
	DiscordMessageIn,
	DiscordMessageLimited,
	DiscordMessageOut
} from "../../src/discord/interface";
import { TournamentInterface } from "../../src/TournamentManager";

export class TournamentMock implements TournamentInterface {
	public async authenticateHost(tournamentId: string, hostId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async listTournaments(): Promise<string> {
		throw new Error("Not yet implemented!");
	}

	public async createTournament(host: string, server: string, name: string, desc: string): Promise<[string, string]> {
		throw new Error("Not yet implemented!");
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async addAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async removeAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async addHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async removeHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async confirmPlayer(msg: DiscordMessageIn): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async cleanRegistration(msg: DiscordMessageLimited): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async openTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async startTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async cancelTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async submitScore(
		tournamentId: string,
		playerId: string,
		scorePlayer: number,
		scoreOpp: number
	): Promise<string> {
		throw new Error("Not yet implemented!");
	}

	public async nextRound(tournamentId: string): Promise<number> {
		throw new Error("Not yet implemented!");
	}

	public async listPlayers(tournamentId: string): Promise<DiscordAttachmentOut> {
		throw new Error("Not yet implemented!");
	}

	public async getPlayerDeck(tournamentId: string, playerId: string): Promise<Deck> {
		throw new Error("Not yet implemented!");
	}

	public async dropPlayer(tournamentId: string, playerId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async syncTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async generatePieChart(tournamentId: string): Promise<DiscordAttachmentOut> {
		throw new Error("Not yet implemented!");
	}
}
