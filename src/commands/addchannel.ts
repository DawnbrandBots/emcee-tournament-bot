import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:addchannel");

const command: CommandDefinition = {
	name: "addchannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, baseType, channelMention] = args; // 2 optional and thus potentially undefined
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const type = baseType?.toLowerCase() === "private" ? "private" : "public";
		const channelId = support.discord.getChannel(channelMention) || msg.channel.id;
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addchannel",
				type,
				destination: channelId,
				event: "attempt"
			})
		);
		await support.tournamentManager.addAnnouncementChannel(id, channelId, type);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addchannel",
				type,
				destination: channelId,
				event: "success"
			})
		);
		await support.discord.sendMessage(
			channelId,
			`This channel added as a ${type} announcement channel for Tournament ${id}!`
		);
		await reply(
			msg,
			`${support.discord.mentionChannel(channelId)} added as a ${type} announcement channel for Tournament ${id}!`
		);
	}
};

export default command;
