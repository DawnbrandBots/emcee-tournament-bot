import { CommandDefinition } from "../Command";
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
		const csv = await support.tournamentManager.generateDeckDump(id);
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
		await reply(msg, `Player decklists for Tournament ${id} is attached.`, csv);
	}
};

export default command;
