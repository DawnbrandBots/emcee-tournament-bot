import { CommandDefinition } from "../Command";
import logger from "../util/logger";

const command: CommandDefinition = {
	name: "cancel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// This executor's logic is now surprisingly similar to finish
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		logger.verbose(`Attempting to cancel tournament ${id}`);
		// TODO: error path
		await support.tournamentManager.finishTournament(id, true);
		await msg.reply(`Tournament ${id} successfully canceled.`);
	}
};

export default command;
