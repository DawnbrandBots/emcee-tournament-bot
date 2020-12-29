import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:dump");

const command: CommandDefinition = {
	name: "dump",
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
				command: "dump",
				event: "attempt"
			})
		);
		const csv = await support.tournamentManager.generateDeckDump(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "dump",
				event: "success"
			})
		);
		await msg.reply(`Player decklists for Tournament ${id} is attached.`, csv);
	}
};

export default command;
