import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:players");

const command: CommandDefinition = {
	name: "players",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "players",
				event: "attempt"
			})
		);
		const list = await support.tournamentManager.listPlayers(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "players",
				event: "success"
			})
		);
		await msg.reply(`A list of players for tournament ${id} with the theme of their deck is attached.`, list);
	}
};

export default command;
