import { UnauthorisedHostError, UnauthorisedPlayerError } from "../errors";
import { WebsiteTournament } from "../website/interface";

export interface DatabaseWrapper {
	createTournament(
		host: string,
		server: string,
		challongeId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament>;
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void>;
	getTournament(tournamentId: string): Promise<DatabaseTournament>;
	getActiveTournaments(): Promise<DatabaseTournament[]>;
	addAnnouncementChannel(tournamentId: string, channel: string, type: "public" | "private"): Promise<void>;
	removeAnnouncementChannel(tournamentId: string, channel: string, type: "public" | "private"): Promise<void>;
	addHost(tournamentId: string, newHost: string): Promise<void>;
	removeHost(tournamentId: string, newHost: string): Promise<void>;
	openRegistration(tournamentId: string, channelId: string, messageId: string): Promise<void>;
	getRegisterMessages(tournamentId: string): Promise<DatabaseMessage[]>;
	cleanRegistration(channelId: string, messageId: string): Promise<void>;
	getPendingTournaments(playerId: string): Promise<DatabaseTournament[]>;
	addPendingPlayer(channelId: string, messageId: string, playerId: string): Promise<DatabaseTournament | undefined>;
	removePendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined>;
	confirmPlayer(tournamentId: string, playerId: string, challongeId: number, deck: string): Promise<void>;
	removeConfirmedPlayerReaction(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined>;
	removeConfirmedPlayerForce(tournamentId: string, playerId: string): Promise<DatabaseTournament | undefined>;
	startTournament(tournamentId: string, rounds: number): Promise<string[]>;
	synchronise(tournamentId: string, newData: SynchroniseTournament): Promise<void>;
}

export interface DatabasePlayer {
	discordId: string;
	challongeId: number;
	deck: string;
}

export interface DatabaseMessage {
	message: string;
	channel: string;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
	status: "preparing" | "in progress" | "complete";
	players: string[]; // list of IDs, for more info use findPlayer();
	publicChannels: string[];
	privateChannels: string[];
	findHost: (id: string) => boolean;
	findPlayer: (id: string) => DatabasePlayer;
}

export interface SynchroniseTournament {
	name: string;
	description: string;
	players: number[];
}

export class DatabaseInterface {
	private db: DatabaseWrapper;
	constructor(db: DatabaseWrapper) {
		this.db = db;
	}

	public async authenticateHost(tournamentId: string, hostId: string): Promise<void> {
		const tournament = await this.getTournament(tournamentId);
		const auth = tournament.findHost(hostId);
		if (!auth) {
			throw new UnauthorisedHostError(hostId, tournamentId);
		}
	}

	public async authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
		const tournament = await this.getTournament(tournamentId);
		const player = tournament.findPlayer(playerId);
		if (!player) {
			throw new UnauthorisedPlayerError(playerId, tournamentId);
		}
	}

	public async listTournaments(): Promise<DatabaseTournament[]> {
		return await this.db.getActiveTournaments();
	}

	public async createTournament(host: string, server: string, web: WebsiteTournament): Promise<DatabaseTournament> {
		return await this.db.createTournament(host, server, web.id, web.name, web.desc);
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		await this.db.updateTournament(tournamentId, name, desc);
	}

	public async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		return await this.db.getTournament(tournamentId);
	}

	public async addAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		await this.db.addAnnouncementChannel(tournamentId, channel, type);
	}

	public async removeAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		await this.db.removeAnnouncementChannel(tournamentId, channel, type);
	}

	public async addHost(tournamentId: string, newHost: string): Promise<void> {
		await this.db.addHost(tournamentId, newHost);
	}

	public async removeHost(tournamentId: string, newHost: string): Promise<void> {
		await this.db.removeHost(tournamentId, newHost);
	}

	public async openRegistration(tournamentId: string, channelId: string, messageId: string): Promise<void> {
		await this.db.openRegistration(tournamentId, channelId, messageId);
	}

	public async getRegisterMessages(tournamentId: string): Promise<DatabaseMessage[]> {
		return await this.db.getRegisterMessages(tournamentId);
	}

	public async cleanRegistration(channelId: string, messageId: string): Promise<void> {
		await this.db.cleanRegistration(channelId, messageId);
	}

	public async getPendingTournaments(playerId: string): Promise<DatabaseTournament[]> {
		return await this.db.getPendingTournaments(playerId);
	}

	public async addPendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		return await this.db.addPendingPlayer(channelId, messageId, playerId);
	}

	public async removePendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		return await this.db.removePendingPlayer(channelId, messageId, playerId);
	}

	public async confirmPlayer(
		tournamentId: string,
		playerId: string,
		challongeId: number,
		deck: string
	): Promise<void> {
		return await this.db.confirmPlayer(tournamentId, playerId, challongeId, deck);
	}

	public async removeConfirmedPlayerReaction(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		return await this.removeConfirmedPlayerReaction(channelId, messageId, playerId);
	}

	public async removeConfirmedPlayerForce(
		tournamentId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		return await this.removeConfirmedPlayerForce(tournamentId, playerId);
	}

	public async startTournament(tournamentId: string, rounds: number): Promise<string[]> {
		return this.db.startTournament(tournamentId, rounds);
	}

	public async synchronise(tournamentId: string, data: SynchroniseTournament): Promise<void> {
		await this.db.synchronise(tournamentId, data);
	}
}