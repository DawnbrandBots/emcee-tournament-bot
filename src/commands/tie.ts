import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { getRound } from "../util/challonge";
import { getLogger } from "../util/logger";

const logger = getLogger("command:tie");

const command: CommandDefinition = {
	name: "tie",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.IPR
		);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "tie",
				event: "attempt"
			})
		);
		// gets only open matches
		const matches = await support.challonge.getMatches(id, true);
		const round = getRound(id, matches); // for reply
		for (const match of matches) {
			// choice of player is arbitray, challonge correctly does not highlight a winner
			await support.challonge.submitScore(id, match, match.player1, 0, 0);
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "tie",
				event: "success"
			})
		);
		await msg.reply(
			`All outstanding matches in Round ${round} of **${tournament.name}** successfully ended in a tie!`
		);
	}
};

export default command;
