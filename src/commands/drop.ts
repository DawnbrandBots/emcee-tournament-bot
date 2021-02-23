import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:drop");

const command: CommandDefinition = {
	name: "drop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id] = args;
		await support.database.authenticatePlayer(id, msg.author.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "drop",
				event: "attempt"
			})
		);
		await support.tournamentManager.dropPlayer(id, msg.author.id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "drop",
				event: "success"
			})
		);
		const name = support.discord.getUsername(msg.author.id);
		await reply(msg, `Player ${name}, you have successfully dropped from Tournament ${id}.`);
	}
};

export default command;
