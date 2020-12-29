import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removechannel");

const command: CommandDefinition = {
	name: "removechannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addchannel
		const [id, baseType, channelMention] = args; // 2 optional and thus potentially undefined
		await support.tournamentManager.authenticateHost(id, msg);
		const type = baseType?.toLowerCase() === "private" ? "private" : "public";
		const channelId = support.discord.getChannel(channelMention) || msg.channelId;
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "removechannel",
				type,
				destination: channelId,
				event: "attempt"
			})
		);
		await support.tournamentManager.removeAnnouncementChannel(id, channelId, type);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "removechannel",
				type,
				destination: channelId,
				event: "success"
			})
		);
		await support.discord.sendMessage(
			channelId,
			`This channel removed as a ${type} announcement channel for Tournament ${id}!`
		);
		await msg.reply(
			`${support.discord.mentionChannel(
				channelId
			)} removed as a ${type} announcement channel for Tournament ${id}!`
		);
	}
};

export default command;
