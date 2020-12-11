import {
	DatabaseMessage,
	DatabaseTournament,
	DatabaseWrapper,
	SynchroniseTournament
} from "../../src/database/interface";

export class DatabaseWrapperMock implements DatabaseWrapper {
	createTournament(
		host: string,
		server: string,
		challongeId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		throw new Error("Not yet implemented!");
	}
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	getTournament(tournamentId: string): Promise<DatabaseTournament> {
		throw new Error("Not yet implemented!");
	}
	getActiveTournaments(): Promise<DatabaseTournament[]> {
		throw new Error("Not yet implemented!");
	}
	addAnnouncementChannel(tournamentId: string, channel: string, type: "public" | "private"): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	removeAnnouncementChannel(tournamentId: string, channel: string, type: "public" | "private"): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	addHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	removeHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	openRegistration(tournamentId: string, channelId: string, messageId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	getRegisterMessages(tournamentId: string): Promise<DatabaseMessage[]> {
		throw new Error("Not yet implemented!");
	}
	cleanRegistration(channelId: string, messageId: string): Promise<void> {
		throw new Error("Not yet implemented!");
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
	confirmPlayer(tournamentId: string, playerId: string, challongeId: number, deck: string): Promise<void> {
		throw new Error("Not yet implemented!");
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
	startTournament(tournamentId: string, rounds: number): Promise<string[]> {
		throw new Error("Not yet implemented!");
	}
	nextRound(tournamentId: string): Promise<number> {
		throw new Error("Not yet implemented!");
	}
	finishTournament(tournamentId: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
	synchronise(tournamentId: string, newData: SynchroniseTournament): Promise<void> {
		throw new Error("Not yet implemented!");
	}
}
