import { escapeMarkdown } from "discord.js";
import { CommandDefinition } from "../Command";
import { firstMentionOrFail } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addbye");

const command: CommandDefinition = {
	name: "addbye",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		const player = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addbye",
				mention: player.id,
				event: "attempt"
			})
		);
		const byes = await support.database.registerBye(id, player.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addbye",
				mention: player.id,
				event: "success"
			})
		);
		const names = byes.map(snowflake => `<@${snowflake}>`).join(", ");
		const who = `${player} (${escapeMarkdown(player.tag)})`;
		await msg.reply(`Bye registered for ${who} in **${tournament.name}**!\nAll byes: ${names}`);
	}
};

export default command;
