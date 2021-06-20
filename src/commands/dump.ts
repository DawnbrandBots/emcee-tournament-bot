import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:dump");

const command: CommandDefinition = {
	name: "dump",
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
				command: "dump",
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
				command: "dump",
				event: "success"
			})
		);
		await reply(msg, `Player decklists for Tournament ${id} is attached.`, {
			name: `${id} Decks.csv`,
			file
		});
	}
};

export default command;
