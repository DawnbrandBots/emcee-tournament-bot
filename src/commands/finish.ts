import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:finish");

const command: CommandDefinition = {
	name: "finish",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, earlyArg] = args;
		const early = !!earlyArg;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
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
				await msg.reply(
					`**${tournament.name}** is not finished. If you intend to end it early, use \`mc!finish ${id}|early\`.`
				);
				return;
			}
			throw e;
		}
		support.scores.delete(id);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "finish",
				event: "success"
			})
		);
		await msg.reply(`**${tournament.name}** successfully finished.`);
	}
};

export default command;
