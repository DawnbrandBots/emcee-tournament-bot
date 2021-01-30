import * as csv from "@fast-csv/format";
import { CommandDefinition } from "../Command";
import { getDeck } from "../deck/deck";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:dump");

const command: CommandDefinition = {
	name: "dump",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
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
		const players = await support.tournamentManager.getConfirmed(id);
		const rows = players.map(player => {
			const deck = getDeck(player.deck);
			return {
				Player: support.discord.getUsername(player.discordId), // TODO: REST needed
				Deck: `Main: ${deck.mainText}, Extra: ${deck.extraText}, Side: ${deck.sideText}`.replaceAll("\n", ", ")
			};
		});
		const file = await csv.writeToString(rows);
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
