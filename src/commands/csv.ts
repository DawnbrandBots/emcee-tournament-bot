import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { username } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:csv");

const command: CommandDefinition = {
	name: "csv",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, pieArg] = args;
		const pie = !!pieArg;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "csv",
				pie,
				event: "attempt"
			})
		);
		const players = await support.database.getConfirmed(id);
		if (players.length < 1) {
			await msg.reply(`**${tournament.name}** has no players!`);
			return;
		}
		await msg.reply(":hammer: Working…");
		let file: Buffer;
		if (pie) {
			const themes = players
				.map(player => {
					const deck = support.decks.getDeck(player.deck);
					return deck.themes.length > 0 ? deck.themes.join("/") : "No themes";
				})
				.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
			file = await csv.writeToBuffer([["Theme", "Count"], ...themes.entries()]);
		} else {
			const rows = await Promise.all(
				players.map(async player => {
					const deck = support.decks.getDeck(player.deck);
					const tag = (await username(msg.client, player.discordId)) || player.discordId;
					const text = `Main: ${deck.mainText}, Extra: ${deck.extraText}, Side: ${deck.sideText}`;
					return {
						Player: tag,
						Theme: deck.themes.length > 0 ? deck.themes.join("/") : "No themes",
						Deck: text.replace(/\n/g, ", ")
					};
				})
			);
			file = await csv.writeToBuffer(rows, { headers: true });
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "csv",
				pie,
				event: "success"
			})
		);
		await msg.reply({
			content: pie
				? `A list of themes in tournament ${id} with their counts is attached.`
				: `A list of players for tournament ${id} with their deck is attached.`,
			files: [{ attachment: file, name: `${id}.csv` }]
		});
	}
};

export default command;
