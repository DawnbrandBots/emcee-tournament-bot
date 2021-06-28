import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:players");

const command: CommandDefinition = {
	name: "players",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, pieArg] = args;
		const pie = !!pieArg;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "players",
				pie,
				event: "attempt"
			})
		);
		const players = await support.database.getConfirmed(id);
		if (players.length < 1) {
			await reply(msg, `Tournament ${id} has no players!`);
			return;
		}
		let file;
		if (pie) {
			const themes = players
				.map(player => {
					const deck = support.decks.getDeck(player.deck);
					return deck.themes.length > 0 ? deck.themes.join("/") : "No themes";
				})
				.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
			file = await csv.writeToString([["Theme", "Count"], ...themes.entries()]);
		} else {
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
			file = await csv.writeToString(rows, { headers: true });
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "players",
				pie,
				event: "success"
			})
		);
		await reply(
			msg,
			pie
				? `A list of themes in tournament ${id} with their counts is attached.`
				: `A list of players for tournament ${id} with their deck is attached.`,
			{
				name: `${id}.csv`,
				file
			}
		);
	}
};

export default command;
