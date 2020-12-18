import { CommandHandler } from "./CommandHandler";
import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername } from "./config/env";
import { DatabaseInterface } from "./database/interface";
import { DatabaseWrapperMongoose } from "./database/mongoose";
import { DatabaseWrapperPostgres } from "./database/postgres";
import { getCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { Timer } from "./timer/Timer";
import { TournamentManager } from "./TournamentManager";
import logger from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

const eris = new DiscordWrapperEris(logger);
const discord = new DiscordInterface(eris, prefix, logger);

const wrapper = process.env.EMCEE_USE_POSTGRES ? new DatabaseWrapperPostgres() : new DatabaseWrapperMongoose();
const database = new DatabaseInterface(wrapper);

const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
const website = new WebsiteInterface(challonge);

const tournamentManager = new TournamentManager(discord, database, website, logger, Timer);

getCardArray().then(() => {
	logger.info("ygo-data preload for ydeck complete");
	new CommandHandler(discord, tournamentManager, logger);
});
