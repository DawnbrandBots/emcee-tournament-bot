import { CommandDefinition } from "../Command";
import logger from "../util/logger";

const command: CommandDefinition = {
	name: "addchannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, baseType, channelMention] = args; // 2 optional
		await support.tournamentManager.authenticateHost(id, msg);
		let type = baseType ? baseType.toLowerCase().trim() : "public";
		if (!(type === "private")) {
			type = "public";
		}
		let channelId = support.discord.getChannel(channelMention);
		if (!channelId) {
			channelId = msg.channelId;
		}
		await support.tournamentManager.addAnnouncementChannel(id, channelId, type as "public" | "private");
		logger.verbose(`Channel ${channelId} added to tournament ${id} with level ${type} by ${msg.author}.`);
		await support.discord.sendMessage(
			channelId,
			`This channel added as a ${type} announcement channel for Tournament ${id}!`
		);
		await msg.reply(
			`${support.discord.mentionChannel(channelId)} added as a ${type} announcement channel for Tournament ${id}!`
		);
	}
};

export default command;
