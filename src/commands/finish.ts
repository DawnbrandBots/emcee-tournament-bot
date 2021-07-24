import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:finish");

const command: CommandDefinition = {
	name: "finish",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, earlyArg] = args;
		const early = !!earlyArg;
		await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "attempt"
			})
		);
		try {
			await support.tournamentManager.finishTournament(id, early);
		} catch (e) {
			// TODO: filter specifically for challonge error with finalise
			if (!early) {
				await reply(
					msg,
					`Tournament ${id} is not finished. If you intend to end it early, use \`mc!finish ${id}|early\`.`
				);
				return;
			}
			throw e;
		}
		support.scores.delete(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "success"
			})
		);
		await reply(msg, `Tournament ${id} successfully finished.`);
	}
};

export default command;
