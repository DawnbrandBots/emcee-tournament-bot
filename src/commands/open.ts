import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:open");

const command: CommandDefinition = {
	name: "open",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		await support.tournamentManager.openTournament(id);
		logger.verbose(`Tournament ${id} opened for registration by ${msg.author}.`);
		await msg.reply(`Tournament ${id} opened for registration!`);
	}
};

export default command;
