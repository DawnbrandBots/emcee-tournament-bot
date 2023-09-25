import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import { TournamentManager } from "./TournamentManager";
import { getConfig } from "./config"; // Must be imported first among first-party modules
import { initializeDatabase } from "./database/postgres";
import { initializeDeckManager } from "./deck";
import { registerEvents } from "./events";
import { OrganiserRoleProvider } from "./role/organiser";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { TimeWizard } from "./timer";
import { send } from "./util/discord";
import { getLogger } from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";

const logger = getLogger("index");

(async () => {
	const config = getConfig();
	const database = await initializeDatabase(config.postgresqlUrl);
	const decks = await initializeDeckManager(config.octokitToken);

	const templater = new Templater();
	const guides = await templater.load("guides");
	logger.info(`Loaded ${guides} templates from "guides".`);

	const challonge = new WebsiteWrapperChallonge(config.challongeUsername, config.challongeToken);

	const bot = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.DirectMessageReactions,
			GatewayIntentBits.MessageContent
		],
		partials: [Partials.Channel, Partials.Message, Partials.Reaction]
	});
	const organiserRole = new OrganiserRoleProvider(config.defaultTORole, 0x3498db);
	const participantRole = new ParticipantRoleProvider(bot, 0xe67e22);
	const timeWizard = new TimeWizard({
		sendMessage: async (...args) => (await send(bot, ...args)).id,
		editMessage: async (channelId, messageId, newMessage) => {
			const channel = await bot.channels.fetch(channelId);
			if (channel?.isTextBased()) {
				const sent = await channel.messages.fetch(messageId);
				await sent.edit(newMessage);
			} else {
				throw new Error(`${channelId} is not a text channel`);
			}
		}
	});
	const tournamentManager = new TournamentManager(database, challonge, templater);
	registerEvents(bot, config.defaultPrefix, {
		tournamentManager,
		organiserRole,
		participantRole,
		database,
		challonge,
		scores: new Map(),
		decks,
		templater,
		timeWizard
	});

	bot.on("ready", async () => {
		logger.notify(`Logged in as ${bot.user?.tag} - ${bot.user?.id}`);
		bot.user?.setActivity("🕯️ Keeping the lights on", { type: ActivityType.Custom });
	});
	bot.once("ready", async () => await timeWizard.load());
	bot.login().catch(logger.error);
	process.once("SIGTERM", () => {
		bot.destroy();
	});
})();
