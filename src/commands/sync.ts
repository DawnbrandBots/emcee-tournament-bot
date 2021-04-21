import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:sync");

const command: CommandDefinition = {
	name: "sync",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "sync",
				event: "attempt"
			})
		);
		if (tournament.status === TournamentStatus.COMPLETE) {
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "sync",
					event: "already complete"
				})
			);
			await reply(msg, `**${tournament.name}** has already concluded!`);
			return;
		}
		const tournamentData = await support.challonge.getTournament(id);
		await support.database.synchronise(id, {
			name: tournamentData.name,
			description: tournamentData.desc,
			players: tournamentData.players.map(({ challongeId, discordId }) => ({ challongeId, discordId }))
		});
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "sync",
				event: "success"
			})
		);
		await reply(msg, `Tournament ${id} database successfully synchronised with remote website.`);
	}
};

export default command;
