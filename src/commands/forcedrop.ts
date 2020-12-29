import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcedrop");

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const player = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "forcedrop",
				mention: player,
				event: "attempt"
			})
		);
		await support.tournamentManager.dropPlayer(id, player, true);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "forcedrop",
				mention: player,
				event: "success"
			})
		);
		const name = support.discord.getUsername(player);
		await msg.reply(`Player ${name} successfully dropped from Tournament ${id}.`);
	}
};

export default command;
