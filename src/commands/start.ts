import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:start");

const command: CommandDefinition = {
	name: "start",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		await support.tournamentManager.startTournament(id);
		logger.verbose(`Tournament ${id} commenced by ${msg.author}.`);
		await msg.reply(`Tournament ${id} successfully commenced!`);
	}
};

export default command;
