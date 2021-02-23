import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:start");

const command: CommandDefinition = {
	name: "start",
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
				command: "start",
				event: "attempt"
			})
		);
		await support.tournamentManager.startTournament(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "start",
				event: "success"
			})
		);
		await reply(msg, `Tournament ${id} successfully commenced!`);
	}
};

export default command;
