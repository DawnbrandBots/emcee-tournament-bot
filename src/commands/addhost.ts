import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:addhost");

const command: CommandDefinition = {
	name: "addhost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const newHost = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addhost",
				mention: newHost,
				event: "attempt"
			})
		);
		await support.tournamentManager.addHost(id, newHost);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addhost",
				mention: newHost,
				event: "success"
			})
		);
		await reply(msg, `${support.discord.mentionUser(newHost)} added as a host for Tournament ${id}!`);
	}
};

export default command;
