import { database } from "../database/mongoose";
import { discord } from "../discord";
import logger from "../logger";
import { website } from "../website";
import { TournamentManager } from "./TournamentManager";

export const tournamentManager = new TournamentManager(discord, database, website, logger);
