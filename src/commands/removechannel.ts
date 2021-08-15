import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removechannel");

const command: CommandDefinition = {
	name: "removechannel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addchannel
		const [id, baseType] = args; // 1 optional and thus potentially undefined
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
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
		if (tournament.status === TournamentStatus.COMPLETE) {
			await msg.reply(`**${tournament.name}** has already concluded!`);
			return;
		}
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
		/* await msg.reply(
			`${support.discord.mentionChannel(
				channelId
			)} removed as a ${type} announcement channel for **${tournament.name}**!`
		); */
		await msg.reply(`This channel removed as a ${type} announcement channel for **${tournament.name}**!`);
	}
};

export default command;
