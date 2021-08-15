import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { getLogger } from "../util/logger";
import { ChallongeTieBreaker } from "../website/interface";

const logger = getLogger("command:tb");

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
	name: "tb",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, tb1, tb2, tb3] = args;
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
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
			msg.guildId,
			TournamentStatus.PREPARING
		);
		// if no options provided, display current status
		if (!tb1) {
			const webTournament = await support.challonge.getTournament(id);
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "tb",
					event: "success"
				})
			);
			await msg.reply(
				`**${tournament.name}** has the following tie-breaker priority:\n${webTournament.tieBreaks
					.map((tb, i) => `${i + 1}. ${realTBNames[tb]}`)
					.join("\n")}`
			);
			return;
		}
		// if invalid options provided, display advice
		if (!tb2 || !tb3 || !(tb1 in realTBNames) || !(tb2 in realTBNames) || !(tb3 in realTBNames)) {
			await msg.reply(
				`Could not update tie-breakers for **${
					tournament.name
				}**. You must provide three valid options in priority order. The valid options and their corresponding meaning are:\n${Object.entries(
					realTBNames
				)
					.map(tb => `\`${tb[0]}\` (${tb[1]})`)
					.join("\n")}`
			);
			return;
		}
		// if valid options provided, update tournament
		await support.challonge.updateTieBreakers(id, [tb1, tb2, tb3] as ChallongeTieBreaker[]);
		await msg.reply(
			`Tie-breaker settings updated for **${tournament.name}**.\n${[tb1, tb2, tb3]
				.map((tb, i) => `${i + 1}. ${realTBNames[tb as ChallongeTieBreaker]}`)
				.join("\n")}`
		);
	}
};

export default command;
