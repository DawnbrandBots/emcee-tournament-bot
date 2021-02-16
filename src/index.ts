import { Client } from "eris";
import { prefix, toRole } from "./config/config.json";
import { challongeToken, challongeUsername, discordToken, postgresqlUrl } from "./config/env";
import { initializeDatabase } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { registerEvents } from "./events";
import { OrganiserRoleProvider } from "./role/organiser";
import { ParticipantRoleProvider } from "./role/participant";
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

	const challonge = new WebsiteInterface(new WebsiteWrapperChallonge(challongeUsername, challongeToken));

	const bot = new Client(discordToken, {
		restMode: true
	});
	const eris = new DiscordWrapperEris(bot);
	const discord = new DiscordInterface(eris);
	const organiserRole = new OrganiserRoleProvider(toRole, 0x3498db);
	const participantRole = new ParticipantRoleProvider(bot, 0xe67e22);
	const tournamentManager = new TournamentManager(discord, database, challonge, templater, participantRole);
	registerEvents(bot, prefix, { discord, tournamentManager, organiserRole, database, challonge, scores: new Map() });
	discord.onDelete(msg => tournamentManager.cleanRegistration(msg));

	let firstReady = true;
	bot.on("ready", async () => {
		logger.info(`Logged in as ${bot.user.username}#${bot.user.discriminator} - ${bot.user.id}`);
		if (firstReady) {
			firstReady = false;
			await tournamentManager.loadTimers();
			await tournamentManager.loadButtons();
		}
	});
	bot.connect().catch(logger.error);
	process.once("SIGTERM", () => {
		bot.disconnect({ reconnect: false });
	});
})();
