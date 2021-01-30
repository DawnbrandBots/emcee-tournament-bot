import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:update");

const command: CommandDefinition = {
	name: "update",
	requiredArgs: ["id", "name", "description"],
	executor: async (msg, args, support) => {
		const [id, name, desc] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
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
		await support.tournamentManager.updateTournament(id, name, desc);
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
		await reply(msg, `Tournament \`${id}\` updated! It now has the name ${name} and the given description.`);
	}
};

export default command;
