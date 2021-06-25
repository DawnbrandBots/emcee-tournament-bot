import { CommandDefinition } from "../Command";
import { parseUserMention, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removehost");

const command: CommandDefinition = {
	name: "removehost",
	requiredArgs: ["id", "who"],
	executor: async (msg, args, support) => {
		// Mirror of addhost
		const [id, who] = args;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		const newHost = parseUserMention(who) || who;
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
		await support.database.removeHost(id, newHost);
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
