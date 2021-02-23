import {
	DatabaseMessage,
	DatabasePlayer,
	DatabasePlayerWithTournament,
	DatabaseTournament,
	TournamentStatus
} from "../../src/database/interface";
import { DatabaseWrapperPostgres } from "../../src/database/postgres";
import { TournamentNotFoundError, UnauthorisedHostError, UnauthorisedPlayerError } from "../../src/util/errors";

function findPlayer(id: string): DatabasePlayer | undefined {
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

function transform(players: string[]): DatabasePlayer[] {
	// TypeScript is not smart enough to figure out that the array cannot have undefined items now
	// players.map(findPlayer).filter(p => p !== undefined);
	// may be able to use some kind of type guard but some say this is equivalent to a cast or assert
	// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
	const result = [];
	for (const player of players) {
		const obj = findPlayer(player);
		if (obj) {
			result.push(obj);
		}
	}
	return result;
}

export class DatabaseWrapperMock {
	tournaments: DatabaseTournament[];
	constructor() {
		this.tournaments = [
			{
				id: "tourn1",
				name: "Tournament 1",
				description: "The first tournament",
				status: TournamentStatus.PREPARING,
				hosts: ["host1"],
				players: transform(["player1", "player2", "sJustRight", "sTooMany"]),
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				server: "testServer",
				byes: ["player1"],
				findPlayer
			},
			{
				id: "tourn2",
				name: "Tournament 2",
				description: "The second tournament",
				status: TournamentStatus.IPR,
				players: transform(["player1", "player2", "sTooMany"]),
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				hosts: ["host2"],
				server: "testServer",
				byes: ["player2"],
				findPlayer
			},
			{
				id: "tourn3",
				name: "Tournament 3",
				description: "The third tournament",
				status: TournamentStatus.PREPARING,
				hosts: ["host1"],
				players: transform(["sTooMany"]),
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				server: "testServer",
				byes: [],
				findPlayer
			}
		];
	}
	async authenticateHost(tournamentId: string, userId: string): Promise<DatabaseTournament> {
		if (userId.startsWith("not")) {
			throw new UnauthorisedHostError(userId, tournamentId);
		}
		return this.tournaments[0]; // NOT USED
	}
	async authenticatePlayer(tournamentId: string, userId: string): Promise<DatabasePlayerWithTournament> {
		if (userId.startsWith("not")) {
			throw new UnauthorisedPlayerError(userId, tournamentId);
		}
		return {
			challongeId: NaN,
			tournament: {
				name: "Not used",
				privateChannels: []
			}
		};
	}
	async createTournament(
		hostId: string,
		serverId: string,
		tournamentId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		const status = TournamentStatus.PREPARING;
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
			findPlayer
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
				status: TournamentStatus.PREPARING,
				hosts: ["testHost"],
				players: [],
				server: "testServer",
				publicChannels: [],
				privateChannels: [],
				byes: [],
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId === "create1") {
			return {
				id: tournamentId,
				name: "Small tournament",
				description: "A Small Tournament",
				status: TournamentStatus.PREPARING,
				hosts: ["testHost"],
				players: [],
				server: "testServer",
				publicChannels: [],
				privateChannels: [],
				byes: [],
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId.startsWith("bye")) {
			return {
				id: tournamentId,
				name: "Bye tournament",
				description: "A tournament with a natural bye",
				status: TournamentStatus.PREPARING,
				hosts: ["testHost"],
				players: transform(["a", "b", "c"]),
				server: "testServer",
				publicChannels: [],
				privateChannels: [],
				byes: [],
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId.startsWith("pend")) {
			return {
				id: tournamentId,
				name: "Pending tournament",
				description: "A tournament with a pending player",
				status: TournamentStatus.PREPARING,
				hosts: ["testHost"],
				players: transform(["a", "b"]),
				server: "testServer",
				publicChannels: ["channel1"],
				privateChannels: ["channel2"],
				byes: [],
				findPlayer: (): undefined => undefined
			};
		}
		if (tournamentId === "bigTournament") {
			return {
				id: tournamentId,
				name: "Big tournament",
				description: "A tournament with a lot of players",
				status: TournamentStatus.IPR,
				hosts: ["testHost"],
				players: transform(["a", "b", "c", "d", "e", "f", "g", "h", "i"]),
				server: "testServer",
				publicChannels: ["topChannel"],
				privateChannels: ["channel2"],
				byes: [],
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
	async getConfirmedTournaments(playerId: string): Promise<DatabaseTournament[]> {
		return this.tournaments.filter(
			t => t.status === TournamentStatus.PREPARING && t.players.find(p => p.discordId === playerId)
		);
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
		this.tournaments[index].players.push({
			discordId: playerId,
			challongeId: -1,
			deck: ""
		});
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
	async registerBye(): Promise<string[]> {
		throw new Error("Not implemented");
	}
	async removeBye(): Promise<string[]> {
		throw new Error("Not implemented");
	}
	dropFromAll(): ReturnType<DatabaseWrapperPostgres["dropFromAll"]> {
		throw new Error("Not implemented");
	}
	async getConfirmed(): Promise<DatabasePlayer[]> {
		return [];
	}
	getConfirmedPlayer(): Promise<DatabasePlayer> {
		throw new Error("Not implemented");
	}
	getPlayerByChallonge(): Promise<DatabasePlayer> {
		throw new Error("Not implemented");
	}
}
