import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:score");

const command: CommandDefinition = {
	name: "score",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id, score] = args;
		await support.tournamentManager.authenticatePlayer(id, msg);
		const scores = score.split("-").map(s => parseInt(s, 10));
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "score",
				scores,
				event: "attempt"
			})
		);
		if (scores.length !== 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		const response = await support.tournamentManager.submitScore(id, msg.author, scores[0], scores[1]);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "score",
				scores,
				event: "success"
			})
		);
		await msg.reply(response);
	}
};

export default command;
