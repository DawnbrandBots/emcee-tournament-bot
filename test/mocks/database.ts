import { DatabaseMessage, DatabasePlayer, DatabaseTournament, DatabaseWrapper } from "../../src/database/interface";
import { TournamentNotFoundError } from "../../src/util/errors";

export class DatabaseWrapperMock implements DatabaseWrapper {
	tournaments: DatabaseTournament[];
	constructor() {
		this.tournaments = [
			{
				id: "mc_tourn1",
				name: "Tournament 1",
				description: "The first tournament",
				status: "preparing",
				hosts: ["host1"],
				players: ["player1", "player2", "sJustRight", "sTooMany"],
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				server: "testServer",
				byes: ["player1"],
				findHost(id: string): boolean {
					return !id.startsWith("not");
				},
				findPlayer(id: string): DatabasePlayer | undefined {
					if (id.startsWith("not")) {
						return;
					}
					return {
						discordId: id,
						challongeId: parseInt(id.slice(id.length - 1), 10), // will turn player1 into 1
						deck:
							"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
					};
				}
			},
			{
				id: "tourn2",
				name: "Tournament 2",
				description: "The second tournament",
				status: "preparing",
				players: ["player1", "player2", "sTooMany"],
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				hosts: ["host2"],
				server: "testServer",
				byes: ["player2"],
				findHost(): boolean {
					return true;
				},
				findPlayer(id: string): DatabasePlayer {
					return {
						discordId: id,
						challongeId: parseInt(id, 10), // will turn player1 into 1
						deck:
							"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
					};
				}
			}
		];
	}
	async createTournament(
		hostId: string,
		serverId: string,
		tournamentId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		const status = "preparing" as const;
		const newTournament = {
			id: tournamentId,
			name: name,
			description: description,
			status: status,
			players: [],
			publicChannels: [],
			privateChannels: [],
			hosts: [hostId],
			server: serverId,
			byes: [],
			findHost(): boolean {
				return true;
			},
			findPlayer(id: string): DatabasePlayer {
				return {
					discordId: id,
					challongeId: parseInt(id, 10), // will turn player1 into 1
					deck:
						"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
				};
			}
		};
		this.tournaments.push(newTournament);
		return newTournament;
	}
	async updateTournament(): Promise<void> {
		return;
	}
	async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		if (tournamentId.startsWith("small")) {
			return {
				id: tournamentId,
				name: "Small tournament",
				description: "A Small Tournament",
				status: "preparing",
				hosts: ["testHost"],
				players: [],
				server: "testServer",
				publicChannels: [],
				privateChannels: [],
				byes: [],
				findHost: (): boolean => true,
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId.startsWith("bye")) {
			return {
				id: tournamentId,
				name: "Bye tournament",
				description: "A tournament with a natural bye",
				status: "preparing",
				hosts: ["testHost"],
				players: ["a", "b", "c"],
				server: "testServer",
				publicChannels: [],
				privateChannels: [],
				byes: [],
				findHost: (): boolean => true,
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId.startsWith("pend")) {
			return {
				id: tournamentId,
				name: "Pending tournament",
				description: "A tournament with a pending player",
				status: "preparing",
				hosts: ["testHost"],
				players: ["a", "b"],
				server: "testServer",
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				byes: [],
				findHost: (): boolean => true,
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId === "bigTournament") {
			return {
				id: tournamentId,
				name: "Big tournament",
				description: "A tournament with a lot of players",
				status: "in progress",
				hosts: ["testHost"],
				players: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
				server: "testServer",
				publicChannels: ["topChannel"],
				privateChannels: ["channel2"],
				byes: [],
				findHost: (): boolean => true,
				findPlayer: (p: string): DatabasePlayer => {
					return {
						discordId: p,
						challongeId: ["a", "b", "c", "d", "e", "f", "g", "h", "i"].indexOf(p),
						deck: "ydke://!!!"
					};
				}
			};
		}
		const tournament = this.tournaments.find(t => t.id === tournamentId);
		if (!tournament) {
			throw new TournamentNotFoundError(tournamentId);
		}
		return tournament;
	}
	async getActiveTournaments(): Promise<DatabaseTournament[]> {
		return this.tournaments;
	}
	async addAnnouncementChannel(tournamentId: string, channelId: string): Promise<void> {
		const index = this.tournaments.findIndex(t => t.id === tournamentId);
		this.tournaments[index].publicChannels.push(channelId);
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
	async getPendingTournaments(playerId: string): Promise<DatabaseTournament[]> {
		if (playerId === "tooLong") {
			return this.tournaments;
		}
		if (playerId.startsWith("s")) {
			return [];
		}
		return [this.tournaments[0]];
	}
	async addPendingPlayer(channelId: string, messageId: string): Promise<DatabaseTournament | undefined> {
		if (channelId.startsWith("wrong") || messageId.startsWith("wrong")) {
			return;
		}
		return this.tournaments[0];
	}
	async removePendingPlayer(): Promise<DatabaseTournament | undefined> {
		return this.tournaments[0];
	}
	async confirmPlayer(tournamentId: string, playerId: string): Promise<void> {
		const index = this.tournaments.findIndex(t => t.id === tournamentId);
		this.tournaments[index].players.push(playerId);
	}
	async removeConfirmedPlayerReaction(): Promise<DatabaseTournament | undefined> {
		return this.tournaments[0];
	}
	removeConfirmedPlayerForce(tournamentId: string): Promise<DatabaseTournament | undefined> {
		return this.getTournament(tournamentId);
	}
	async startTournament(tournamentId: string): Promise<string[]> {
		if (tournamentId.startsWith("pend")) {
			return ["pendingPlayer"];
		}
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
	async registerBye(): Promise<void> {
		return;
	}
	async removeBye(): Promise<void> {
		return;
	}
}
