import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { getDeck } from "../deck/deck";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:pie");

const command: CommandDefinition = {
	name: "pie",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "pie",
				event: "attempt"
			})
		);
		const players = await support.database.getConfirmed(id);
		// TODO: benchmark performance of map-reduce
		const themes = players
			.map(player => {
				const deck = getDeck(player.deck);
				return deck.themes.length > 0 ? deck.themes.join("/") : "No themes";
			})
			.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
		const file = await csv.writeToString([["Theme", "Count"], ...themes.entries()]);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "pie",
				event: "success"
			})
		);
		await reply(msg, `Archetype counts for Tournament ${id} are attached.`, {
			name: `${id} Pie.csv`,
			file
		});
	}
};

export default command;
