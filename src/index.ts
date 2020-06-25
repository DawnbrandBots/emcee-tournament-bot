import { bot } from "./bot";
import { confirmDeck } from "./tournament";
import { parseCommand } from "./commands";
import logger from "./logger";

bot.on("ready", () => {
	logger.log({
		level: "info",
		message: `Logged in as ${bot.user.username} - ${bot.user.id}`
	});
});

bot.on("messageCreate", async msg => {
	if (msg.author.bot) {
		return;
	}
	try {
		await confirmDeck(msg);
		await parseCommand(msg);
	} catch (e) {
		logger.log({
			level: "info",
			message: e.message
		});
	}
});

bot.connect().catch(e => {
	logger.log({
		level: "error",
		message: e.message
	});
});
