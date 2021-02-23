import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:round");

const command: CommandDefinition = {
	name: "round",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, skip] = args; // second is optional and may be undefined
		await support.database.authenticateHost(id, msg.author.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "round",
				event: "attempt"
			})
		);
		await support.tournamentManager.nextRound(id, !!skip);
		support.scores.get(id)?.clear();
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "round",
				event: "success"
			})
		);
		await reply(msg, `New round successfully started for Tournament ${id}.`);
	}
};

export default command;
