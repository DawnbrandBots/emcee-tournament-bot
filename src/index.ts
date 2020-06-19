import { Message, PrivateChannel } from "eris";
import { bot } from "./bot";
import { DiscordDeck } from "./discordDeck";
import { challonge } from "./challonge";

bot.on("messageCreate", (msg: Message) => {
	if (msg.author.bot) {
		return;
	}
	if (msg.content === "!testerino") {
		challonge
			.createTournament({
				name: "Test Tournament",
				description: "A test tournament created to test the API",
				open_signup: false,
				url: "aktesttournament1",
				tournament_type: "swiss"
			})
			.then(response => {
				msg.channel.createMessage("```json\n" + JSON.stringify(response, null, 4) + "```");
			});
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
