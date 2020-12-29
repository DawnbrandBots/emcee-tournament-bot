import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:open");

const command: CommandDefinition = {
	name: "open",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "open",
				event: "attempt"
			})
		);
		await support.tournamentManager.openTournament(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "open",
				event: "success"
			})
		);
		await msg.reply(`Tournament ${id} opened for registration!`);
	}
};

export default command;
