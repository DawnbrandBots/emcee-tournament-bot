import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { advanceRoundDiscord, parseTime } from "../round";
import { getLogger } from "../util/logger";

const logger = getLogger("command:round");

const command: CommandDefinition = {
	name: "round",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Argument combinations:
		// id
		// id|timer
		// id|skip
		// id|timer|skip
		// 50 is the assumed default timer for live tournaments
		const [id] = args;
		const skip = args[1] === "skip" || args[2] === "skip";
		const timer = (args.length === 2 && !skip) || args.length > 2 ? parseTime(args[1]) : 50;
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.IPR
		);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "round",
				event: "attempt",
				timer,
				skip
			})
		);
		await advanceRoundDiscord(support, tournament, timer, skip);
		support.scores.get(id)?.clear();
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "round",
				event: "success"
			})
		);
		await msg.reply(
			`Pairings sent out for **${tournament.name}**. Please check the private channels for any failed DMs.`
		);
	}
};

export default command;
