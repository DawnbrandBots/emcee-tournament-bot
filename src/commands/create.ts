import { CommandDefinition } from "../Command";
import { ChallongeIDConflictError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:create");

const command: CommandDefinition = {
	name: "create",
	requiredArgs: ["name", "description"],
	executor: async (msg, args, support) => {
		await support.organiserRole.authorise(msg);
		const [name, desc] = args;
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "create",
				name,
				desc,
				event: "attempt"
			})
		);
		try {
			const [id, url, guide] = await support.tournamentManager.createTournament(
				msg.author.id,
				msg.guildId || "private",
				name,
				desc
			);
			// TODO: missing failure path
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					command: "create",
					id,
					url,
					event: "success"
				})
			);
			await msg.reply(
				`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
			);
			await msg.reply(guide);
		} catch (e) {
			if (e instanceof ChallongeIDConflictError) {
				await msg.reply(
					`Tournament ID ${e.tournamentId} already taken on Challonge. This is an error with Emcee, so please report it, but in the meantime, try using a different tournament name.`
				);
			}
			// throwing the error will pass it on to be logged
			throw e;
		}
	}
};

export default command;
