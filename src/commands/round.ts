import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { advanceRoundDiscord } from "../round";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:round");

const command: CommandDefinition = {
	name: "round",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, TournamentStatus.IPR);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "round",
				event: "attempt"
			})
		);
		await advanceRoundDiscord(support, tournament, "TODO", args[1] === "skip");
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
		await reply(
			msg,
			`Pairings sent out for **${tournament.name}**. Please check the private channels for any failed DMs.`
		);
	}
};

export default command;
