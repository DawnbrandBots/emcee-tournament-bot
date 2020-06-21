import { bot } from "./bot";

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.connect().catch(console.error);
