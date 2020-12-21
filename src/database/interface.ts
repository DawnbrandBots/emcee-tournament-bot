import { UnauthorisedHostError, UnauthorisedPlayerError } from "../util/errors";
import { WebsiteTournament } from "../website/interface";

export interface DatabaseWrapper {
	createTournament(
		hostId: string,
		serverId: string,
		tournamentId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament>;
	updateTournament(tournamentId: string, name: string, desc: string): Promise<void>;
	getTournament(tournamentId: string): Promise<DatabaseTournament>;
	getActiveTournaments(): Promise<DatabaseTournament[]>;
	addAnnouncementChannel(tournamentId: string, channelId: string, type: "public" | "private"): Promise<void>;
	removeAnnouncementChannel(tournamentId: string, channelId: string, type: "public" | "private"): Promise<void>;
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
	startTournament(tournamentId: string): Promise<string[]>;
	finishTournament(tournamentId: string): Promise<void>;
	synchronise(tournamentId: string, newData: SynchroniseTournament): Promise<void>;
	registerBye(tournamentId: string, playerId: string): Promise<void>;
	removeBye(tournamentId: string, playerId: string): Promise<void>;
}

export interface DatabasePlayer {
	discordId: string;
	challongeId: number;
	deck: string;
}

export interface DatabaseMessage {
	messageId: string;
	channelId: string;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
	status: "preparing" | "in progress" | "complete";
	hosts: string[];
	players: string[]; // list of IDs, for more info use findPlayer();
	server: string;
	publicChannels: string[];
	privateChannels: string[];
	byes: string[];
	findHost: (id: string) => boolean;
	findPlayer: (id: string) => DatabasePlayer | undefined;
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

	public async createTournament(
		hostId: string,
		serverId: string,
		web: WebsiteTournament
	): Promise<DatabaseTournament> {
		return await this.db.createTournament(hostId, serverId, web.id, web.name, web.desc);
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		await this.db.updateTournament(tournamentId, name, desc);
	}

	public async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		return await this.db.getTournament(tournamentId);
	}

	public async addAnnouncementChannel(
		tournamentId: string,
		channelId: string,
		type: "public" | "private"
	): Promise<void> {
		await this.db.addAnnouncementChannel(tournamentId, channelId, type);
	}

	public async removeAnnouncementChannel(
		tournamentId: string,
		channelId: string,
		type: "public" | "private"
	): Promise<void> {
		await this.db.removeAnnouncementChannel(tournamentId, channelId, type);
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
		return await this.db.removeConfirmedPlayerReaction(channelId, messageId, playerId);
	}

	public async removeConfirmedPlayerForce(
		tournamentId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		return await this.db.removeConfirmedPlayerForce(tournamentId, playerId);
	}

	public async startTournament(tournamentId: string): Promise<string[]> {
		return this.db.startTournament(tournamentId);
	}

	public async finishTournament(tournamentId: string): Promise<void> {
		await this.db.finishTournament(tournamentId);
	}

	public async synchronise(tournamentId: string, data: SynchroniseTournament): Promise<void> {
		await this.db.synchronise(tournamentId, data);
	}

	public async registerBye(tournamentId: string, playerId: string): Promise<void> {
		await this.db.registerBye(tournamentId, playerId);
	}

	public async removeBye(tournamentId: string, playerId: string): Promise<void> {
		await this.db.removeBye(tournamentId, playerId);
	}
}
