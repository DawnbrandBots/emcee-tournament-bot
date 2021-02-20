import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcedrop");

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id", "who"],
	executor: async (msg, args, support) => {
		const [id, who] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const player = who.startsWith("<@!") && who.endsWith(">") ? who.slice(3, -1) : who;
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcedrop",
				player,
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
		const name = await support.discord.getRESTUsername(player);
		await reply(msg, `Player ${name} successfully dropped from Tournament ${id}.`);
	}
};

export default command;
