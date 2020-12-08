export interface DatabaseWrapper {
	getTournament(tournamentId: string): DatabaseTournament;
}

export interface DatabaseTournament {}

export class DatabaseInterface {
	private db: DatabaseWrapper;
	constructor(db: DatabaseWrapper) {
		this.db = db;
	}

	public getTournament(tournamentId: string): DatabaseTournament {
		return this.db.getTournament(tournamentId);
	}
}
