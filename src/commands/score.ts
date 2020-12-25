import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";

const command: CommandDefinition = {
	name: "score",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id, score] = args;
		await support.tournamentManager.authenticatePlayer(id, msg.author);
		const scores = score.split("-");
		const scoreNums = scores.map(s => parseInt(s, 10));
		if (scoreNums.length < 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		const response = await support.tournamentManager.submitScore(id, msg.author, scoreNums[0], scoreNums[1]);
		await msg.reply(response);
	}
};

export default command;
