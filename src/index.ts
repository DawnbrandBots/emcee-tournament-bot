import { Message } from "eris";
import { bot } from "./bot";

bot.on("messageCreate", (msg: Message) => {
	if (msg.author.bot) {
		return;
	}
});

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.connect().catch(console.error);
