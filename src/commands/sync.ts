import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:sync");

const command: CommandDefinition = {
	name: "sync",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id);
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
		await support.tournamentManager.syncTournament(id);
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
