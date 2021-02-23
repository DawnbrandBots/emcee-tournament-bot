import { CommandDefinition } from "../Command";
import { firstMentionOrFail, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removehost");

const command: CommandDefinition = {
	name: "removehost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addhost
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id);
		const newHost = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removehost",
				mention: newHost,
				event: "attempt"
			})
		);
		await support.tournamentManager.removeHost(id, newHost);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removehost",
				mention: newHost,
				event: "success"
			})
		);
		await reply(msg, `${support.discord.mentionUser(newHost)} removed as a host for Tournament ${id}!`);
	}
};

export default command;
