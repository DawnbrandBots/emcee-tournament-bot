import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addhost");

const command: CommandDefinition = {
	name: "addhost",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const newHost = support.discord.getMentionedUser(msg);
		await support.tournamentManager.addHost(id, newHost);
		logger.verbose(`Tournament ${id} added new host ${newHost} by ${msg.author}.`);
		await msg.reply(`${support.discord.mentionUser(newHost)} added as a host for Tournament ${id}!`);
	}
};

export default command;
