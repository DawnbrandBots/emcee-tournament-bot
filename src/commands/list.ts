import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:list");

const command: CommandDefinition = {
	name: "list",
	requiredArgs: [],
	executor: (msg, args, support) => {
		return new Promise(resolve => {
			setTimeout(async () => {
				void args;
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
				if (list.length === 0) {
					await msg.reply("There are no open tournaments you have access to!");
				} else {
					await msg.reply(`\`\`\`\n${list}\`\`\``);
				}
				resolve();
			}, 4000);
		});
	}
};

export default command;
