import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removechannel");

const command: CommandDefinition = {
	name: "removechannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addchannel
		const [id, baseType] = args; // 1 optional and thus potentially undefined
		await support.database.authenticateHost(id, msg.author.id);
		const type = baseType?.toLowerCase() === "private" ? "private" : "public";
		const channelId = msg.channel.id;
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removechannel",
				type,
				// destination: channelId,
				event: "attempt"
			})
		);
		await support.database.removeAnnouncementChannel(id, channelId, type);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removechannel",
				type,
				// destination: channelId,
				event: "success"
			})
		);
		/* await reply(
			msg,
			`${support.discord.mentionChannel(
				channelId
			)} removed as a ${type} announcement channel for Tournament ${id}!`
		); */
		await reply(msg, `This channel removed as a ${type} announcement channel for Tournament ${id}!`);
	}
};

export default command;
