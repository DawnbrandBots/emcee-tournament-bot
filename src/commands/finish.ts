import { CommandDefinition } from "../Command";
import logger from "../util/logger";

const command: CommandDefinition = {
	name: "finish",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		logger.verbose(`Attempting to finish tournament ${id}`);
		// TODO: error path
		await support.tournamentManager.finishTournament(id, false);
		logger.verbose(`Tournament ${id} finished.`);
		await msg.reply(`Tournament ${id} successfully finished.`);
	}
};

export default command;
