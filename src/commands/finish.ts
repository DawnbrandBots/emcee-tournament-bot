import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:finish");

const command: CommandDefinition = {
	name: "finish",
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
				command: "finish",
				event: "attempt"
			})
		);
		// TODO: error path
		await support.tournamentManager.finishTournament(id, false);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "success"
			})
		);
		await reply(msg, `Tournament ${id} successfully finished.`);
	}
};

export default command;
