import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removehost");

const command: CommandDefinition = {
	name: "removehost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addhost
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const newHost = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "removehost",
				mention: newHost,
				event: "attempt"
			})
		);
		await support.tournamentManager.removeHost(id, newHost);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "removehost",
				mention: newHost,
				event: "success"
			})
		);
		await msg.reply(`${support.discord.mentionUser(newHost)} removed as a host for Tournament ${id}!`);
	}
};

export default command;
