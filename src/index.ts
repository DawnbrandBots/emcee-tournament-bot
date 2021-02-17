import { Client } from "eris";
import { getConfig } from "./config"; // Must be imported first among first-party modules
import { initializeDatabase } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { registerEvents } from "./events";
import { OrganiserRoleProvider } from "./role/organiser";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { PersistentTimer, PersistentTimerDiscordDelegate } from "./timer";
import { TournamentManager } from "./TournamentManager";
import { getLogger } from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("index");

(async () => {
	const config = getConfig();
	const database = await initializeDatabase(config.postgresqlUrl);
	await initializeCardArray(config.octokitToken);

	const templater = new Templater();
	const guides = await templater.load("guides");
	logger.info(`Loaded ${guides} templates from "guides".`);

	const challonge = new WebsiteWrapperChallonge(config.challongeUsername, config.challongeToken);
	const website = new WebsiteInterface(challonge);

	const bot = new Client(config.discordToken, {
		restMode: true
	});
	const eris = new DiscordWrapperEris(bot);
	const discord = new DiscordInterface(eris);
	const organiserRole = new OrganiserRoleProvider(config.defaultTORole, 0x3498db);
	const participantRole = new ParticipantRoleProvider(bot, 0xe67e22);
	const delegate: PersistentTimerDiscordDelegate = {
		sendMessage: async (...args) => (await bot.createMessage(...args)).id,
		editMessage: async (...args) => void (await bot.editMessage(...args))
	};
	const tournamentManager = new TournamentManager(discord, database, website, templater, participantRole, {
		create: async (...args) => await PersistentTimer.create(delegate, ...args),
		loadAll: async () => await PersistentTimer.loadAll(delegate)
	});
	registerEvents(bot, config.defaultPrefix, { discord, tournamentManager, organiserRole }, database, website);
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
