import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addhost");

const command: CommandDefinition = {
	name: "addhost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const newHost = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "addhost",
				mention: newHost,
				event: "attempt"
			})
		);
		await support.tournamentManager.addHost(id, newHost);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "addhost",
				mention: newHost,
				event: "success"
			})
		);
		await msg.reply(`${support.discord.mentionUser(newHost)} added as a host for Tournament ${id}!`);
	}
};

export default command;
