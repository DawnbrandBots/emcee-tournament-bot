import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:sync");

const command: CommandDefinition = {
	name: "sync",
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
				command: "sync",
				event: "attempt"
			})
		);
		await support.tournamentManager.syncTournament(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "sync",
				event: "success"
			})
		);
		await msg.reply(`Tournament ${id} database successfully synchronised with remote website.`);
	}
};

export default command;
