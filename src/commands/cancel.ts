import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:cancel");

const command: CommandDefinition = {
	name: "cancel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// This executor's logic is now surprisingly similar to finish
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "cancel",
				event: "attempt"
			})
		);
		// TODO: error path, and apparently the Discord logic is in this function
		await support.tournamentManager.finishTournament(id, true);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "cancel",
				event: "success"
			})
		);
		await reply(msg, `Tournament ${id} successfully canceled.`);
	}
};

export default command;
