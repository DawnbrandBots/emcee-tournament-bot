import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:round");

const command: CommandDefinition = {
	name: "round",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, skip] = args; // second is optional and may be undefined
		await support.tournamentManager.authenticateHost(id, msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "round",
				event: "attempt"
			})
		);
		await support.tournamentManager.nextRound(id, !!skip);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "round",
				event: "success"
			})
		);
		await msg.reply(`New round successfully started for Tournament ${id}.`);
	}
};

export default command;
