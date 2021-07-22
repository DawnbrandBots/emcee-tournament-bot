import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcescore");

const realTBNames = {
	"match wins": "Match Wins",
	"game wins": "Game/Set Wins",
	"game win percentage": "Game/Set Win %",
	"points scored": "Points Scored",
	"points difference": "Points Difference",
	"match wins vs tied": "Wins vs Tied Participants",
	"median buchholz": "Median-Buchholz system"
};

const command: CommandDefinition = {
	name: "forcescore",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "tb",
				event: "attempt"
			})
		);
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildID,
			TournamentStatus.IPR
		);
		const webTournament = await support.challonge.getTournament(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "tb",
				event: "success"
			})
		);
		await reply(
			msg,
			`**${tournament.name}** has the following tie-breaker priority:\n${webTournament.tieBreaks
				.map((tb, i) => `${i + 1}. ${realTBNames[tb]}`)
				.join("\n")}`
		);
	}
};

export default command;
