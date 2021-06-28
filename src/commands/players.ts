import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:players");

const command: CommandDefinition = {
	name: "players",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "players",
				event: "attempt"
			})
		);
		const players = await support.database.getConfirmed(id);
		const rows = await Promise.all(
			players.map(async player => {
				const deck = support.decks.getDeck(player.deck);
				const username = (await support.discord.getRESTUsername(player.discordId)) || player.discordId;
				const text = `Main: ${deck.mainText}, Extra: ${deck.extraText}, Side: ${deck.sideText}`;
				return {
					Player: username,
					Theme: deck.themes.length > 0 ? deck.themes.join("/") : "No themes",
					Deck: text.replace(/\n/g, ", ")
				};
			})
		);
		const file = await csv.writeToString(rows, { headers: true });
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "players",
				event: "success"
			})
		);
		await reply(msg, `A list of players for tournament ${id} with the theme of their deck is attached.`, {
			name: `${id}.csv`,
			file
		});
	}
};

export default command;
