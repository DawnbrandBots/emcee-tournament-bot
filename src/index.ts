import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, postgresqlUrl } from "./config/env";
import { initializeBehaviours } from "./CommandHandler";
import { initializeDatabase } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { Templater } from "./templates";
import { TournamentManager } from "./TournamentManager";
import { getLogger } from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("index");

(async () => {
	const database = await initializeDatabase(postgresqlUrl);

	await initializeCardArray();

	const templater = new Templater();
	const guides = await templater.load("guides");
	logger.info(`Loaded ${guides} templates from "guides".`);

	const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
	const website = new WebsiteInterface(challonge);

	const eris = new DiscordWrapperEris();
	const discord = new DiscordInterface(eris);

	const tournamentManager = new TournamentManager(discord, database, website, templater);
	initializeBehaviours(prefix, discord, tournamentManager);

	await eris.ready;
	await tournamentManager.loadTimers();
	await tournamentManager.loadButtons();
})();
