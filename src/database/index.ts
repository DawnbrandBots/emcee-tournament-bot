import { UnauthorisedHostError, UnauthorisedPlayerError, UserError } from "../errors";
import { WebsiteTournament } from "../website";

export interface DatabaseWrapper {
	createTournament(
		host: string,
		server: string,
		challongeId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament>;
	getTournament(tournamentId: string): Promise<DatabaseTournament>;
	getActiveTournaments(): Promise<DatabaseTournament[]>;
}

export interface DatabasePlayer {
	id: string;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
	status: "preparing" | "in progress" | "complete";
	players: string[]; // list of IDs, for more info use findPlayer();
	findHost: (id: string) => boolean;
	findPlayer: (id: string) => DatabasePlayer | undefined;
	updateDetails: (name: string, desc: string) => Promise<void>;
}

export class DatabaseInterface {
	private db: DatabaseWrapper;
	constructor(db: DatabaseWrapper) {
		this.db = db;
	}

	public async authenticateHost(tournamentId: string, hostId: string): Promise<void> {
		const tournament = await this.getTournament(tournamentId);
		const auth = await tournament.findHost(hostId);
		if (!auth) {
			throw new UnauthorisedHostError(hostId, tournamentId);
		}
	}

	public async authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
		const tournament = await this.getTournament(tournamentId);
		const player = await tournament.findPlayer(playerId);
		if (!player) {
			throw new UnauthorisedPlayerError(playerId, tournamentId);
		}
	}

	public async listTournaments(): Promise<DatabaseTournament[]> {
		return await this.db.getActiveTournaments();
	}

	public async createTournament(host: string, server: string, web: WebsiteTournament): Promise<DatabaseTournament> {
		// TODO: As DB design is fleshed out, decide exactly what properties we want to extract
		// from the website interface
		return await this.db.createTournament(host, server, web.id, web.name, web.desc);
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		const tournament = await this.getTournament(tournamentId);
		if (!(tournament.status === "preparing")) {
			throw new UserError(`It's too late to update the information for ${tournament.name}.`);
		}
		await tournament.updateDetails(name, desc);
	}

	public async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		return await this.db.getTournament(tournamentId);
	}
}