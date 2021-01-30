import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:list");

const command: CommandDefinition = {
	name: "list",
	requiredArgs: [],
	executor: async (msg, args, support) => {
		void args;
		await support.organiserRole.authorise(msg);
		// This log may be meaningless because we perform no parameter processing
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "list",
				event: "attempt"
			})
		);
		const list = await support.tournamentManager.listTournaments(msg.serverId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "list",
				event: "success"
			})
		);
		if (list.length === 0) {
			await reply(msg, "There are no open tournaments you have access to!");
		} else {
			await reply(msg, `\`\`\`\n${list}\`\`\``);
		}
	}
};

export default command;
