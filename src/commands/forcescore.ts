import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:forcescore");

const command: CommandDefinition = {
	name: "forcescore",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		const [id, score] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const player = support.discord.getMentionedUser(msg);
		// player is guaranteed, throws if not found
		const scores = score.split("-").map(s => parseInt(s, 10));
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcescore",
				mention: player,
				scores,
				event: "attempt"
			})
		);
		if (scores.length < 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		await support.tournamentManager.submitScore(id, player, scores[0], scores[1], true);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcescore",
				mention: player,
				scores,
				event: "success"
			})
		);
		await reply(
			msg,
			`Score of ${score} submitted in favour of ${support.discord.mentionUser(
				player
			)} (${support.discord.getUsername(player)}) in Tournament ${id}!`
		);
	}
};

export default command;
