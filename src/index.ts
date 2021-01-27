import { Client } from "eris";
import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, discordToken, postgresqlUrl } from "./config/env";
import { initializeDatabase } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { registerEvents } from "./events";
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

	const bot = new Client(discordToken, {
		restMode: true
	});
	const eris = new DiscordWrapperEris(bot);
	const discord = new DiscordInterface(eris);

	const tournamentManager = new TournamentManager(discord, database, website, templater);
	registerEvents(bot, prefix, { discord, tournamentManager });
	discord.onDelete(msg => tournamentManager.cleanRegistration(msg));

	await eris.ready;
	await tournamentManager.loadTimers();
	await tournamentManager.loadButtons();
})();
