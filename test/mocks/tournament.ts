import { DatabasePlayer } from "../../src/database/interface";
import { TournamentInterface } from "../../src/TournamentManager";

export class TournamentMock implements TournamentInterface {
	public async authenticateHost(): Promise<void> {
		return;
	}

	public async authenticatePlayer(): Promise<void> {
		return;
	}

	public async listTournaments(): Promise<string> {
		return "This sure is a list.";
	}

	public async createTournament(hostId: string, serverId: string, name: string): Promise<[string, string, string]> {
		// the point of this file is to return a simulated input for testing other files
		// actual functionality here will be tested with other files
		return [`${name}`, `https://example.com/${name}`, `Guide: mc!help ${name}`];
	}

	public async registerPlayer(): Promise<void> {
		return;
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

	public async finishTournament(): Promise<void> {
		return;
	}

	public async cancelTournament(): Promise<void> {
		return;
	}

	public async submitScore(): Promise<string> {
		return "For more detail, test the tournament handler!";
	}

	public async submitScoreForce(): Promise<string> {
		return "For more detail, test the tournament handler!";
	}

	public async nextRound(): Promise<void> {
		return;
	}

	public async getConfirmed(): Promise<DatabasePlayer[]> {
		return [];
	}

	public async dropPlayer(): Promise<void> {
		return;
	}

	public async syncTournament(): Promise<void> {
		return;
	}

	public async registerBye(): Promise<string[]> {
		return ["bye1"];
	}

	public async removeBye(): Promise<string[]> {
		return ["bye1"];
	}
}
