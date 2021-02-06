import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcescore");

const command: CommandDefinition = {
	name: "forcescore",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		const [id, score] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const player = support.discord.getMentionedUser(msg);
		// player is guaranteed, throws if not found
		const scores = score.split("-").map(s => parseInt(s, 10));
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
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
		const response = await support.tournamentManager.submitScoreForce(id, player, scores[0], scores[1]);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "forcescore",
				mention: player,
				scores,
				event: "success" // success doesn't necessarily meant a score was submitted
			})
		);
		await msg.reply(response);
	}
};

export default command;
