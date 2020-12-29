import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:cancel");

const command: CommandDefinition = {
	name: "cancel",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// This executor's logic is now surprisingly similar to finish
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		logger.verbose(`Attempting to cancel tournament ${id}`);
		// TODO: error path
		await support.tournamentManager.finishTournament(id, true);
		await msg.reply(`Tournament ${id} successfully canceled.`);
	}
};

export default command;
