import { CommandDefinition } from "../Command";
import { parseUserMention } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removehost");

const command: CommandDefinition = {
	name: "removehost",
	requiredArgs: ["id", "who"],
	executor: async (msg, args, support) => {
		// Mirror of addhost
		const [id, who] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		const newHost = parseUserMention(who) || who;
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
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
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removehost",
				mention: newHost,
				event: "success"
			})
		);
		await msg.reply(`<@${newHost}> removed as a host for **${tournament.name}**!`);
	}
};

export default command;
