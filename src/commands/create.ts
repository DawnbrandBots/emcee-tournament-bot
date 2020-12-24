import { CommandDefinition } from "../Command";
import logger from "../util/logger";

const command: CommandDefinition = {
	name: "create",
	requiredArgs: ["name", "description"],
	executor: async (msg, args, support) => {
		await support.discord.authenticateTO(msg);
		const [name, desc] = args;
		const [id, url] = await support.tournamentManager.createTournament(msg.author, msg.serverId, name, desc);
		// TODO: missing failure path
		logger.verbose(`New tournament created ${id} by ${msg.author}.`);
		await msg.reply(
			`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
		);
	}
};

export default command;
