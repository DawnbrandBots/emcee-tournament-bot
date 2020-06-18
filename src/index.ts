import { Message, PrivateChannel } from "eris";
import { bot } from "./bot";
import { Deck } from "./deck";

bot.on("messageCreate", (msg: Message) => {
	if (msg.author.bot) {
		return;
	}
	if (msg.channel instanceof PrivateChannel) {
		Deck.sendProfile(msg).catch(err => {
			msg.channel.createMessage(err).catch(console.error);
		});
	}
});

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.connect().catch(console.error);
