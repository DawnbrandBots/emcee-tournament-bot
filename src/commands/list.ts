import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:list");

const command: CommandDefinition = {
	name: "list",
	requiredArgs: [],
	executor: async (msg, args, support) => {
		void args;
		// TODO: restrict to current server
		await support.discord.authenticateTO(msg);
		// This log may be meaningless because we perform no parameter processing
		// and authenticateTO already logs
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "list",
				event: "attempt"
			})
		);
		const list = await support.tournamentManager.listTournaments(msg.serverId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "list",
				event: "success"
			})
		);
		await msg.reply(`\`\`\`\n${list}\`\`\``);
	}
};

export default command;
