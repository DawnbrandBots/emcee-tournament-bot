import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:create");

const command: CommandDefinition = {
	name: "create",
	requiredArgs: ["name", "description"],
	executor: async (msg, args, support) => {
		await support.discord.authenticateTO(msg);
		const [name, desc] = args;
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "create",
				name,
				desc,
				event: "attempt"
			})
		);
		const [id, url] = await support.tournamentManager.createTournament(msg.author, msg.serverId, name, desc);
		// TODO: missing failure path
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "create",
				id,
				url,
				event: "success"
			})
		);
		await msg.reply(
			`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
		);
	}
};

export default command;
