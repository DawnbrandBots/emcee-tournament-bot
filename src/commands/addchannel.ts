import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addchannel");

const command: CommandDefinition = {
	name: "addchannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, baseType] = args; // 1 optional and thus potentially undefined
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		const type = baseType?.toLowerCase() === "private" ? "private" : "public";
		const channelId = msg.channelId;
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addchannel",
				type,
				event: "attempt"
			})
		);
		if (tournament.status === TournamentStatus.COMPLETE) {
			await msg.reply(`**${tournament.name}** has already concluded!`);
			return;
		}
		await support.database.addAnnouncementChannel(id, channelId, type);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addchannel",
				type,
				event: "success"
			})
		);
		await msg.reply(`This channel added as a ${type} announcement channel for **${tournament.name}**!`);
	}
};

export default command;
