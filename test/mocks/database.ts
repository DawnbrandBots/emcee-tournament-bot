import { DatabaseMessage, DatabasePlayer, DatabaseTournament, DatabaseWrapper } from "../../src/database/interface";
import { TournamentNotFoundError } from "../../src/errors";

export class DatabaseWrapperMock implements DatabaseWrapper {
	tournaments: DatabaseTournament[];
	constructor() {
		this.tournaments = [
			{
				id: "tourn1",
				name: "Tournament 1",
				description: "The first tournament",
				status: "preparing",
				players: ["player1", "player2"],
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				findHost(): boolean {
					return true;
				},
				findPlayer(id: string): DatabasePlayer {
					return {
						discordId: id,
						challongeId: parseInt(id, 10), // will turn player1 into 1
						deck: "" // TODO: plug in ABC.
					};
				}
			},
			{
				id: "tourn2",
				name: "Tournament 2",
				description: "The second tournament",
				status: "preparing",
				players: ["player1", "player2"],
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				findHost(): boolean {
					return true;
				},
				findPlayer(id: string): DatabasePlayer {
					return {
						discordId: id,
						challongeId: parseInt(id, 10), // will turn player1 into 1
						deck: "" // TODO: plug in ABC.
					};
				}
			}
		];
	}
	async createTournament(
		host: string,
		server: string,
		challongeId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		return {
			id: challongeId,
			name: name,
			description: description,
			status: "preparing",
			players: [],
			publicChannels: [],
			privateChannels: [],
			findHost(): boolean {
				return true;
			},
			findPlayer(id: string): DatabasePlayer {
				return {
					discordId: id,
					challongeId: parseInt(id, 10), // will turn player1 into 1
					deck: "" // TODO: plug in ABC.
				};
			}
		};
	}
	async updateTournament(): Promise<void> {
		return;
	}
	async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		const tournament = this.tournaments.find(t => t.id === tournamentId);
		if (!tournament) {
			throw new TournamentNotFoundError(tournamentId);
		}
		return tournament;
	}
	async getActiveTournaments(): Promise<DatabaseTournament[]> {
		return this.tournaments;
	}
	async addAnnouncementChannel(): Promise<void> {
		return;
	}
	async removeAnnouncementChannel(): Promise<void> {
		return;
	}
	async addHost(): Promise<void> {
		return;
	}
	async removeHost(): Promise<void> {
		return;
	}
	async openRegistration(): Promise<void> {
		return;
	}
	async getRegisterMessages(): Promise<DatabaseMessage[]> {
		return [];
	}
	async cleanRegistration(): Promise<void> {
		return;
	}
	getPendingTournaments(playerId: string): Promise<DatabaseTournament[]> {
		throw new Error("Not yet implemented!");
	}
	addPendingPlayer(channelId: string, messageId: string, playerId: string): Promise<DatabaseTournament | undefined> {
		throw new Error("Not yet implemented!");
	}
	removePendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		throw new Error("Not yet implemented!");
	}
	async confirmPlayer(): Promise<void> {
		return;
	}
	removeConfirmedPlayerReaction(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		throw new Error("Not yet implemented!");
	}
	removeConfirmedPlayerForce(tournamentId: string, playerId: string): Promise<DatabaseTournament | undefined> {
		throw new Error("Not yet implemented!");
	}
	async startTournament(): Promise<string[]> {
		return [];
	}
	async nextRound(tournamentId: string): Promise<number> {
		if (tournamentId === "tourn2") {
			return -1;
		}
		return 2;
	}
	async finishTournament(): Promise<void> {
		return;
	}
	async synchronise(): Promise<void> {
		return;
	}
}
