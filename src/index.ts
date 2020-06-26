import { bot } from "./bot";
import { confirmDeck } from "./tournament";
import { parseCommand } from "./commands";
import logger from "./logger";

bot.on("ready", () => logger.info(`Logged in as ${bot.user.username} - ${bot.user.id}`));

bot.on("messageCreate", async msg => {
	if (msg.author.bot) {
		return;
	}
	try {
		await confirmDeck(msg);
		await parseCommand(msg);
	} catch (e) {
		logger.error(e);
	}
});

bot.connect().catch(logger.error);
