import { Tournament } from "./Tournament";
export = EventManager;
/** Class representing an event manager. */
declare class EventManager {
	/**
	 * Array of all tournaments being managed.
	 * @type {Array.<Tournament>}
	 */
	tournaments: Array<Tournament>;
	/**
	 * Create a new tournament.
	 * @param {?String} [id=null] User-defined ID.
	 * @param {Object} [options={}] Options a user can define for a tournament.
	 * @return {Tournament} The newly created tournament.
	 */
	createTournament(id?: string | null, options?: any): Tournament;
	reloadTournament(
		tournament: Tournament
	): Tournament.SwissReloaded | Tournament.RoundRobinReloaded | Tournament.EliminationReloaded;
	/**
	 * Remove an existing tournament from the manager.
	 * @param {Tournament} tournament The tournament to be removed.
	 * @return {Boolean} If the tournament was removed.
	 */
	removeTournament(tournament: Tournament): boolean;
}
