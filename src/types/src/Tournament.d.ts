/** Class representing a tournament. */
export class Tournament {
	/**
	 * Create a new tournament.
	 * @param {String} id String to be the event ID.
	 * @param {Object} options Options that can be defined for a tournament.
	 */
	constructor(id: string, options: any);
	/**
	 * Alphanumeric string ID.
	 * @type {String}
	 */
	eventID: string;
	/**
	 * Name of the tournament.
	 * @type {?String}
	 * @default null
	 */
	name: string | null;
	/**
	 * Whether or not to organize players by seed when pairing.
	 * @type {Boolean}
	 * @default false
	 */
	seededPlayers: boolean;
	/**
	 * If the seeding should be sorted in ascending or descending order.
	 * @type {('asc'|'des')}
	 * @default 'asc'
	 */
	seedOrder: "asc" | "des";
	/**
	 * Format for the first stage of the tournament.
	 * @type {('elim'|'robin'|'swiss')}
	 * @default 'elim'
	 */
	format: "elim" | "robin" | "swiss";
	/**
	 * If there is a third place consolation match.
	 * Only used if single elimination is the format (or playoffs format).
	 * @type {Boolean}
	 * @default false
	 */
	thirdPlaceMatch: boolean;
	/**
	 * Maximum number of players allowed to register for the tournament (minimum 4).
	 * If null, there is no maximum.
	 * @type {?Number}
	 * @default null
	 */
	maxPlayers: number | null;
	/**
	 * The value of a win.
	 * Must be a positive integer.
	 * @type {Number}
	 * @default 1
	 */
	winValue: number;
	/**
	 * The value of a draw/tie.
	 * Must be 0 or greater.
	 * @type {Number}
	 * @default 0.5
	 */
	drawValue: number;
	/**
	 * The value of a loss.
	 * Must be an integer.
	 * @type {Number}
	 * @default 0
	 */
	lossValue: number;
	/**
	 * Creation date and time of the tournament.
	 * @type {Date}
	 */
	startTime: Date;
	/**
	 * Array of all players in the tournament.
	 * @type {Player[]}
	 * @default []
	 */
	players: Player[];
	/**
	 * Array of all matches in the tournament.
	 * @type {Match[]}
	 * @default []
	 */
	matches: Match[];
	/**
	 * If the tournament is active.
	 * @type {Boolean}
	 * @default false
	 */
	active: boolean;
	/**
	 * An object to store any additional information.
	 * @type {Object}
	 * @default {}
	 */
	etc: any;
	/**
	 * Create a new player and add them to the tournament.
	 * @param {String} alias The name of the new player.
	 * @param {String} id The ID of the new player. If null, one will be randomly generated.
	 * @param {Number} seed The seed value of the player. Mandatory if seededPlayers is true.
	 * @returns {Boolean} If the player was created and added.
	 */
	addPlayer(alias: string, id?: string, seed?: number): boolean;
	/**
	 * Remove a player from the tournament.
	 * If the tournament hasn't started, they are removed entirely.
	 * If the tournament has started, they are dropped and marked inactive.
	 * @param {Player} player The player to be removed.
	 * @returns {?Match[]|Boolean} True, null, or array of new matches if player is removed, else false.
	 */
	removePlayer(player: Player): (Match[] | boolean) | null;
	/**
	 * Deletes the results from a match.
	 * If the player was dropped as a result (elimination format), they are made active again.
	 * @param {Match} match Match to have results undone.
	 */
	undoResults(match: Match): void;
	/**
	 * Get the active matches in the tournament.
	 * If no round is specified, it returns all active matches for all rounds.
	 * @param {?Number} round Optional round selector.
	 * @return {Match[]}
	 */
	activeMatches(round?: number | null): Match[];
	/**
	 * Get the current standings of the tournament.
	 * @param {Boolean} [active=true] Filtering only active players.
	 * @return {Player[]}
	 */
	standings(active?: boolean): Player[];

	// Not technically here but in all subclasses
	startEvent(): void;
}
/**
 * Class representing a Swiss pairing tournament.
 * @extends Tournament
 */
export class Swiss extends Tournament {
	/**
	 * Create a new Swiss pairing tournament.
	 * @param {String} id String to be the event ID.
	 * @param {Object} [options={}] Options that can be defined for a tournament.
	 */
	constructor(id: string, options?: any);
	/**
	 * Number of rounds for the first phase of the tournament.
	 * If null, the value is determined by the number of players and the format.
	 * @type {?Number}
	 * @default null
	 */
	numberOfRounds: number | null;
	/**
	 * Format for the second stage of the tournament.
	 * If null, there is only one stage.
	 * @type {?('elim'|'2xelim')}
	 * @default null
	 */
	playoffs: ("elim" | "2xelim") | null;
	/**
	 * Number of possible games for a match, where the winner must win the majority of games up to 1 + x/2 (used for byes).
	 * @type {Number}
	 * @default 1
	 */
	bestOf: number;
	/**
	 * Method to determine which players advance to the second stage of the tournament.
	 * @type {('rank'|'points')}
	 * @default 'rank'
	 */
	cutType: "rank" | "points";
	/**
	 * Breakpoint for determining how many players advance to the second stage of the tournament.
	 * If 0, it will override the playoff format to null.
	 * If -1, all players will advance.
	 * @type {Number}
	 * @default 0
	 */
	cutLimit: number;
	/**
	 * Array of tiebreakers to use, in order of precedence.
	 * Options include: buchholz-cut1, solkoff, median-buchholz, sonneborn-berger, cumulative, versus, magic-tcg, pokemon-tcg.
	 * Defaults for Swiss and Dutch are solkoff and cumulative.
	 * @type {String[]}
	 * @default null
	 */
	tiebreakers: string[];
	/**
	 * If the Dutch variant of Swiss pairings should be used.
	 * @type {Boolean}
	 * @default false
	 */
	dutch: boolean;
	/**
	 * Current round number.
	 * 0 if the tournament has not started, -1 if the tournament is finished.
	 * @type {Number}
	 * @default 0
	 */
	currentRound: number;
	/**
	 * If the event is ready to proceed to the next round.
	 * @type {Boolean}
	 * @default false
	 */
	nextRoundReady: boolean;
	/**
	 * Starts the tournament.
	 */
	startEvent(): void;
	/**
	 * Storing results of a match.
	 * @param {Match} match The match being reported.
	 * @param {Number} playerOneWins Number of wins for player one.
	 * @param {Number} playerTwoWins Number of wins for player two.
	 * @param {Number} [draws=0] Number of draws.
	 * @returns {?Match[]} Array of new matches, or null if result failed.
	 */
	result(match: Match, playerOneWins: number, playerTwoWins: number, draws?: number): Match[] | null;
	/**
	 * Starts the next round, if there are no active matches
	 * @return {(Match[]|Boolean)} Array of new matches, or false if not ready to start the new round.
	 */
	nextRound(): Match[] | boolean;
}
/**
 * Class recreating a Swiss pairing tournament from an existing object.
 * @extends Swiss
 */
export class SwissReloaded extends Swiss {
	constructor(tournament: any);
}
/**
 * Class representing a round-robin pairing tournament.
 * @extends Tournament
 */
export class RoundRobin extends Tournament {
	/**
	 * Create a new round-robin pairing tournament.
	 * @param {String} id String to be the event ID.
	 * @param {Object} [options={}] Options that can be defined for a tournament.
	 */
	constructor(id: string, options?: any);
	/**
	 * Format for the second stage of the tournament.
	 * If null, there is only one stage.
	 * @type {?('elim'|'2xelim')}
	 * @default null
	 */
	playoffs: ("elim" | "2xelim") | null;
	/**
	 * Number of possible games for a match, where the winner must win the majority of games up to 1 + x/2 (used for byes).
	 * @type {Number}
	 * @default 1
	 */
	bestOf: number;
	/**
	 * Method to determine which players advance to the second stage of the tournament.
	 * @type {('rank'|'points')}
	 * @default 'rank'
	 */
	cutType: "rank" | "points";
	/**
	 * Breakpoint for determining how many players advance to the second stage of the tournament.
	 * If 0, it will override the playoff format to null.
	 * If -1, all players will advance.
	 * @type {Number}
	 * @default 0
	 */
	cutLimit: number;
	/**
	 * Either the maximum size of each group, or the number of groups (minimum 2).
	 * If null, there are no groups.
	 * @type {?Number}
	 * @default null
	 */
	groupNumber: number | null;
	/**
	 * Whether to institute the cut limit for each group.
	 * Only applies if cutType is rank.
	 * @type {Boolean}
	 * @default false
	 */
	cutEachGroup: boolean;
	/**
	 * Array of tiebreakers to use, in order of precedence.
	 * Options include: buchholz-cut1, solkoff, median-buchholz, sonneborn-berger, cumulative, versus, magic-tcg, pokemon-tcg.
	 * Defaults for round-robin are sonneborn-berger and versus.
	 * @type {String[]}
	 * @default null
	 */
	tiebreakers: string[];
	/**
	 * If the format is double round-robin.
	 * @type {Boolean}
	 * @default false
	 */
	doubleRR: boolean;
	/**
	 * Array of groups of players.
	 * @type {Array[]}
	 * @default []
	 */
	groups: any[][];
	/**
	 * Current round number.
	 * 0 if the tournament has not started, -1 if the tournament is finished.
	 * @type {Number}
	 * @default 0
	 */
	currentRound: number;
	/**
	 * If the event is ready to proceed to the next round.
	 * @type {Boolean}
	 * @default false
	 */
	nextRoundReady: boolean;
	/**
	 * Starts the tournament.
	 */
	startEvent(): void;
	numberOfRounds: number;
	/**
	 * Storing results of a match.
	 * @param {Match} match The match being reported.
	 * @param {Number} playerOneWins Number of wins for player one.
	 * @param {Number} playerTwoWins Number of wins for player two.
	 * @param {Number} [draws=0] Number of draws.
	 * @returns {?Match[]} Array of new matches, or null if result failed.
	 */
	result(match: Match, playerOneWins: number, playerTwoWins: number, draws?: number): Match[] | null;
	/**
	 * Starts the next round, if there are no active matches
	 * @return {(Match[]|Boolean)} Array of new matches, or false if not ready to start the new round.
	 */
	nextRound(): Match[] | boolean;
	/**
	 * Get the current standings for a group of players in the tournament.
	 * @param {Player[]} group A group of players.
	 * @param {Boolean} [active=true] Filtering only active players.
	 * @return {Player[]}
	 */
	groupStandings(group: Player[], active?: boolean): Player[];
}
/**
 * Class recreating a round-robin pairing tournament from an existing object.
 * @extends RoundRobin
 */
export class RoundRobinReloaded extends RoundRobin {
	constructor(tournament: any);
}
/**
 * Class representing an elimination tournament.
 * @extends Tournament
 */
export class Elimination extends Tournament {
	/**
	 * Create a new elimination tournament.
	 * @param {String} id String to be the event ID.
	 * @param {Object} [options={}] Options that can be defined for a tournament.
	 */
	constructor(id: string, options?: any);
	/**
	 * If the format is double elimination.
	 * @type {Boolean}
	 * @default false
	 */
	doubleElim: boolean;
	tiebreakers: string[];
	/**
	 * Starts the tournament.
	 */
	startEvent(): void;
	/**
	 * Storing results of a match.
	 * @param {Match} match The match being reported.
	 * @param {Number} playerOneWins Number of wins for player one.
	 * @param {Number} playerTwoWins Number of wins for player two.
	 * @param {Number} [draws=0] Number of draws.
	 * @param {Boolean} [dropdown=true] Whether or not to drop the player into loser's bracket in double elimination.
	 * @returns {?Match[]} Array of new matches, or null if result failed.
	 */
	result(
		match: Match,
		playerOneWins: number,
		playerTwoWins: number,
		draws?: number,
		dropdown?: boolean
	): Match[] | null;
}
/**
 * Class recreating an elimination tournament from an existing object.
 * @extends Elimination
 */
export class EliminationReloaded extends Elimination {
	constructor(tournament: any);
}
import Player = require("./Player");
import Match = require("./Match");
