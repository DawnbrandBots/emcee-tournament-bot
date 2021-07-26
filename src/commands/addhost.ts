import { CommandDefinition } from "../Command";
import { firstMentionOrFail, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addhost");

const command: CommandDefinition = {
	name: "addhost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		const newHost = firstMentionOrFail(msg);
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
		await support.database.addHost(id, newHost);
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
		await reply(msg, `${support.discord.mentionUser(newHost)} added as a host for **${tournament.name}**!`);
	}
};

export default command;
