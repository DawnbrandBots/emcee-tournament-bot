import { CommandHandler } from "./CommandHandler";
import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, mongoDbUrl, postgresqlUrl } from "./config/env";
import { DatabaseInterface } from "./database/interface";
import { initializeDatabase as initializeMongo } from "./database/mongoose";
import { initializeDatabase as initializePostgres } from "./database/postgres";
import { getCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { Timer } from "./timer/Timer";
import { TournamentManager } from "./TournamentManager";
import logger from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

(async () => {
	const wrapper = await (process.env.EMCEE_USE_POSTGRES
		? initializePostgres(postgresqlUrl)
		: initializeMongo(mongoDbUrl));
	const database = new DatabaseInterface(wrapper);

	const eris = new DiscordWrapperEris(logger);
	const discord = new DiscordInterface(eris, prefix, logger);

	const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
	const website = new WebsiteInterface(challonge);

	const tournamentManager = new TournamentManager(discord, database, website, logger, Timer);

	await getCardArray();
	logger.info("ygo-data preload for ydeck complete");
	new CommandHandler(discord, tournamentManager, logger);
})().catch(logger.error);
