export = Match;
/** Class representing a match. */
declare class Match {
    /**
     * Create a new match.
     * @param {String|Object} id The unique ID for the match. If an object, it is a match being reclassed.
     * @param {Number} round The round number for the match.
     * @param {Number} matchNumber The match number.
     * @param {?Player[]} players Array of players for the match.
     */
    constructor(id: string | any, round: number, matchNumber: number, players?: any[] | null, ...args: any[]);
    /**
     * Unique ID for the match.
     * @type {String}
     */
    id: string;
    /**
     * Round number for the match.
     * @type {Number}
     */
    round: number;
    /**
     * Match number.
     * @type {Number}
     */
    matchNumber: number;
    /**
     * Player number one in the match.
     * If null, the player has not been determined.
     * @type {?Player}
     * @default null
     */
    playerOne: any;
    /**
     * Player number two in the match.
     * If null, the player has not been determined.
     * @type {?Player}
     * @default null
     */
    playerTwo: any;
    /**
     * The status of the match.
     * @type {Boolean}
     * @default false
     */
    active: boolean;
    /**
     * Number of wins for player one.
     * @type {Number}
     * @default 0
     */
    playerOneWins: number;
    /**
     * Number of wins for player two.
     * @type {Number}
     * @default 0
     */
    playerTwoWins: number;
    /**
     * Number of draws.
     * @type {Number}
     * @default 0
     */
    draws: number;
    /**
     * Next match for the winner.
     * Used in elimination formats.
     * @type {?Match}
     * @default null
     */
    winnerPath: Match | null;
    /**
     * Next match for the loser.
     * Used in elimination formats.
     * @type {?Match}
     * @default null
     */
    loserPath: Match | null;
    /**
     * Updates player values for a result.
     * @param {Number} wv The value of a win.
     * @param {Number} lv The value of a loss.
     * @param {Number} dv The value of a draw.
     */
    resultForPlayers(wv: number, lv: number, dv: number): void;
    /**
     * Clearing previous results of a match for player values.
     * @param {Number} wv The value of a win.
     * @param {Number} lv The value of a loss.
     * @param {Number} dv The value of a draw.
     */
    resetResults(wv: number, lv: number, dv: number): void;
    /**
     * Assign a bye to a player.
     * @param {1|2} player Which player in the match gets a bye.
     * @param {Number} wv The value of a win.
     */
    assignBye(player: 1 | 2, wv: number): void;
}
