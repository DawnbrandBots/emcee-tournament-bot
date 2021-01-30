import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:update");

const command: CommandDefinition = {
	name: "update",
	requiredArgs: ["id", "name", "description"],
	executor: async (msg, args, support) => {
		const [id, name, desc] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
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
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
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
