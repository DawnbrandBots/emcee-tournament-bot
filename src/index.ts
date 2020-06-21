import { Message, PrivateChannel } from "eris";
import { bot } from "./bot";
import { DiscordDeck } from "./discordDeck";

bot.on("messageCreate", (msg: Message) => {
	if (msg.author.bot) {
		return;
	}
	if (msg.channel instanceof PrivateChannel) {
		DiscordDeck.sendProfile(msg).catch(err => {
			msg.channel.createMessage(err).catch(console.error);
		});
	}
});

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.connect().catch(console.error);
