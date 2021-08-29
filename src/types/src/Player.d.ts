export = Player;
/** Class representing a player. */
declare class Player {
    /**
     * Create a new player.
     * @param {String|Object} alias String to be the player's name. If an object, it is a player being reclassed.
     * @param {String} id String to be the player ID.
     * @param {?Number} seed Number to be used as the seed.
     */
    constructor(alias: string | any, id: string, seed: number | null, ...args: any[]);
    /**
     * Name of the player.
     * @type {String}
     */
    alias: string;
    /**
     * Alphanumeric string ID.
     * @type {String}
     */
    id: string;
    /**
     * Value to sort players.
     * @type {?Number}
     */
    seed: number | null;
    /**
     * Number of match points the player has.
     * @type {Number}
     */
    matchPoints: number;
    /**
     * Number of matches played.
     * @type {Number}
     */
    matches: number;
    /**
     * Number of game points the player has.
     * @type {Number}
     */
    gamePoints: number;
    /**
     * Number of games played.
     * @type {Number}
     */
    games: number;
    /**
     * Number of initial byes assigned.
     * @type {Number}
     */
    initialByes: number;
    /**
     * Number of byes assigned.
     * @type {Number}
     */
    byes: number;
    /**
     * Array of results. Objects include match ID, opponent ID, and result ('w', 'l', or 'd').
     * @type {Object[]}
     */
    results: any[];
    /**
     * Color preference for chess tournaments.
     * Add 1 for white (player one) and subtract 1 for black (player two).
     * @type {Number}
     */
    colorPref: number;
    /**
     * Array of colors that player has played in a chess tournament.
     * @type {String[]}
     */
    colors: string[];
    /**
     * If the player is still in the tournament.
     * @type {Boolean}
     */
    active: boolean;
    /**
     * Tiebreaker values.
     * @type {Object}
     */
    tiebreakers: any;
    /**
     * An object to store any additional information.
     * @type {Object}
     * @default {}
     */
    etc: any;
}
