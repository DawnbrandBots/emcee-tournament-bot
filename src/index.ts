import { initializeBehaviours } from "./CommandHandler";
import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, postgresqlUrl } from "./config/env";
import { DatabaseInterface } from "./database/interface";
import { initializeDatabase as initializePostgres } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { Timer } from "./timer/Timer";
import { TournamentManager } from "./TournamentManager";
import { getLogger } from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("");

(async () => {
	const wrapper = await initializePostgres(postgresqlUrl);
	const database = new DatabaseInterface(wrapper);

	const eris = new DiscordWrapperEris();
	const discord = new DiscordInterface(eris);

	const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
	const website = new WebsiteInterface(challonge);

	const tournamentManager = new TournamentManager(discord, database, website, Timer);

	await initializeCardArray();
	logger.info("ygo-data preload for ydeck complete");
	initializeBehaviours(prefix, discord, tournamentManager);
})().catch(logger.error);
