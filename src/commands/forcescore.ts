import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { firstMentionOrFail, reply } from "../util/discord";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcescore");

const command: CommandDefinition = {
	name: "forcescore",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		const [id, score] = args;
		const player = firstMentionOrFail(msg);
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
		// Check command syntax first to avoid a database round trip
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.IPR
		);
		try {
			// eslint-disable-next-line no-var
			var { challongeId } = await support.database.getConfirmedPlayer(player, id);
		} catch {
			throw new UserError(`<@${player}> isn't playing in **${tournament.name}**.`);
		}
		// can also find open matches, just depends on current round
		const match = await support.challonge.findClosedMatch(id, challongeId);
		if (!match) {
			throw new UserError(`Could not find an open match in **${tournament.name}** including <@${player}>.`);
		}
		await support.challonge.submitScore(id, match, challongeId, scores[0], scores[1]);
		const cleared = support.scores.get(id)?.delete(challongeId); // Remove any pending participant-submitted score.
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "forcescore",
				mention: player,
				scores,
				cleared,
				event: "success"
			})
		);
		const username = await support.discord.getRESTUsername(player, true);
		await reply(
			msg,
			`Score of ${scores[0]}-${scores[1]} submitted in favour of <@${player}> (${username}) in **${tournament.name}**!`
		);
	}
};

export default command;
