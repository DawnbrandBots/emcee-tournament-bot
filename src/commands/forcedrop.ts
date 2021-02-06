import { CommandDefinition } from "../Command";
import { firstMentionOrFail, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcedrop");

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const player = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcedrop",
				mention: player,
				event: "attempt"
			})
		);
		await support.tournamentManager.dropPlayer(id, player, true);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcedrop",
				mention: player,
				event: "success"
			})
		);
		const name = support.discord.getUsername(player);
		await reply(msg, `Player ${name} successfully dropped from Tournament ${id}.`);
	}
};

export default command;
