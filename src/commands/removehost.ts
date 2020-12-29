import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:removehost");

const command: CommandDefinition = {
	name: "removehost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const newHost = support.discord.getMentionedUser(msg);
		await support.tournamentManager.removeHost(id, newHost);
		logger.verbose(`Tournament ${id} removed host ${newHost} by ${msg.author}.`);
		await msg.reply(`${support.discord.mentionUser(newHost)} removed as a host for Tournament ${id}!`);
	}
};

export default command;
