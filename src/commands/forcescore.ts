import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";

const command: CommandDefinition = {
	name: "forcescore",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		const [id, score] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const player = support.discord.getMentionedUser(msg);
		// player is guaranteed, throws if not found
		const scores = score.split("-");
		const scoreNums = scores.map(s => parseInt(s, 10));
		if (scoreNums.length < 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		await support.tournamentManager.submitScore(id, player, scoreNums[0], scoreNums[1], true);
		await msg.reply(
			`Score of ${score} submitted in favour of ${support.discord.mentionUser(
				player
			)} (${support.discord.getUsername(player)}) in Tournament ${id}!`
		);
	}
};

export default command;
