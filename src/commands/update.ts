import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { getLogger } from "../util/logger";

const logger = getLogger("command:update");

const command: CommandDefinition = {
	name: "update",
	requiredArgs: ["id", "name", "description"],
	executor: async (msg, args, support) => {
		const [id, name, desc] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "update",
				name,
				desc,
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
					command: "update",
					name,
					desc,
					event: "already complete"
				})
			);
			await msg.reply(`**${tournament.name}** has already concluded!`);
			return;
		}
		// Update DB first because it performs an important check that might throw
		await support.database.updateTournament(id, name, desc);
		await support.challonge.updateTournament(id, name, desc);
		// TODO: missing failure path
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "update",
				name,
				desc,
				event: "success"
			})
		);
		await msg.reply(`Tournament \`${id}\` updated! It now has the name ${name} and the given description.`);
	}
};

export default command;
