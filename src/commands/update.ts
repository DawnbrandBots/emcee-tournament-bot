import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:update");

const command: CommandDefinition = {
	name: "update",
	requiredArgs: ["id", "name", "description"],
	executor: async (msg, args, support) => {
		const [id, name, desc] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		await support.tournamentManager.updateTournament(id, name, desc);
		// TODO: missing failure path
		logger.verbose(`Tournament ${id} updated with name ${name} and description ${desc} by ${msg.author}.`);
		await msg.reply(`Tournament \`${id}\` updated! It now has the name ${name} and the given description.`);
	}
};

export default command;
