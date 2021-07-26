import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:open");

const command: CommandDefinition = {
	name: "open",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "open",
				event: "attempt"
			})
		);
		await support.tournamentManager.openTournament(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "open",
				event: "success"
			})
		);
		await reply(msg, `**${tournament.name}** opened for registration!`);
	}
};

export default command;
