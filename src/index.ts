import { bot } from "./bot";
import { confirmDeck } from "./tournament";

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.on("messageCreate", async msg => {
	if (msg.author.bot) {
		return;
	}
	await confirmDeck(msg);
});

bot.connect().catch(console.error);
