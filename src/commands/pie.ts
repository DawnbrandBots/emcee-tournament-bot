import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:pie");

const command: CommandDefinition = {
	name: "pie",
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
				command: "pie",
				event: "attempt"
			})
		);
		const csv = await support.tournamentManager.generatePieChart(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "pie",
				event: "success"
			})
		);
		await reply(msg, `Archetype counts for Tournament ${id} are attached.`, csv);
	}
};

export default command;
