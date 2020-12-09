import { UnauthorisedHostError, UnauthorisedPlayerError } from "./errors";
import { WebsiteTournament } from "./websiteGeneric";

export interface DatabaseWrapper {
	createTournament(name: string, desc: string): Promise<DatabaseTournament>;
	getTournament(tournamentId: string): Promise<DatabaseTournament>;
}

interface DatabasePlayer {
	id: string;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
	findHost: (id: string) => Promise<boolean>;
	findPlayer: (id: string) => Promise<?DatabasePlayer>;
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

	public async createTournament(web: WebsiteTournament): Promise<DatabaseTournament> {
		// TODO: As DB design is fleshed out, decide exactly what properties we want to extract
		// from the website interface
		return await this.db.createTournament(web.name, web.desc);
	}

	public async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		return await this.db.getTournament(tournamentId);
	}
}

// TODO: Rename to "database" when a wrapper is implemented
export const dummyDb = new DatabaseInterface();
