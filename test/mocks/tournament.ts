import { Deck } from "ydeck";
import { DiscordAttachmentOut } from "../../src/discord/interface";
import { TournamentInterface } from "../../src/TournamentManager";

export class TournamentMock implements TournamentInterface {
	public async authenticateHost(): Promise<void> {
		return;
	}

	public async authenticatePlayer(): Promise<void> {
		return;
	}

	public async listTournaments(): Promise<string> {
		throw new Error("Not yet implemented!");
	}

	public async createTournament(host: string, server: string, name: string): Promise<[string, string]> {
		// the point of this file is to return a simulated input for testing other files
		// actual functionality here will be tested with other files
		return [`mc_${name}`, `https://example.com/${name}`];
	}

	public async updateTournament(): Promise<void> {
		return;
	}

	public async addAnnouncementChannel(): Promise<void> {
		return;
	}

	public async removeAnnouncementChannel(): Promise<void> {
		return;
	}

	public async addHost(): Promise<void> {
		return;
	}

	public async removeHost(): Promise<void> {
		return;
	}

	public async confirmPlayer(): Promise<void> {
		return;
	}

	public async cleanRegistration(): Promise<void> {
		return;
	}

	public async openTournament(): Promise<void> {
		return;
	}

	public async startTournament(): Promise<void> {
		return;
	}

	public async cancelTournament(): Promise<void> {
		return;
	}

	public async submitScore(
		tournamentId: string,
		playerId: string,
		scorePlayer: number,
		scoreOpp: number
	): Promise<string> {
		return "For more detail, test the tournament handler!";
	}

	public async nextRound(tournamentId: string): Promise<number> {
		if (tournamentId === "mc_final") {
			return -1;
		}
		return 2;
	}

	public async listPlayers(tournamentId: string): Promise<DiscordAttachmentOut> {
		throw new Error("Not yet implemented!");
	}

	public async getPlayerDeck(tournamentId: string, playerId: string): Promise<Deck> {
		throw new Error("Not yet implemented!");
	}

	public async dropPlayer(): Promise<void> {
		return;
	}

	public async syncTournament(): Promise<void> {
		return;
	}

	public async generatePieChart(tournamentId: string): Promise<DiscordAttachmentOut> {
		throw new Error("Not yet implemented!");
	}
}
