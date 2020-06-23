import { bot } from "./bot";
import { confirmDeck } from "./tournament";
import { parseCommand } from "./commands";

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.on("messageCreate", async msg => {
	if (msg.author.bot) {
		return;
	}
	try {
		await confirmDeck(msg);
		await parseCommand(msg);
	} catch (e) {
		console.error(e);
	}
});

bot.connect().catch(console.error);
