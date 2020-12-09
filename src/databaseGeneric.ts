import { WebsiteTournament } from "./websiteGeneric";

export interface DatabaseWrapper {
	createTournament(name: string, desc: string): Promise<DatabaseTournament>;
	getTournament(tournamentId: string): Promise<DatabaseTournament>;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
}

export class DatabaseInterface {
	private db: DatabaseWrapper;
	constructor(db: DatabaseWrapper) {
		this.db = db;
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

export const dummyDb = new DatabaseInterface();
