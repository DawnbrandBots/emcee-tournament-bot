import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removechannel");

const command: CommandDefinition = {
	name: "removechannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, baseType, channelMention] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		let type = baseType ? baseType.toLowerCase().trim() : "public";
		if (!(type === "private")) {
			type = "public";
		}
		let channelId = support.discord.getChannel(channelMention);
		if (!channelId) {
			channelId = msg.channelId;
		}
		await support.tournamentManager.removeAnnouncementChannel(id, channelId, type as "public" | "private");
		logger.verbose(`Channel ${channelId} removed from tournament ${id} with level ${type} by ${msg.author}.`);
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
