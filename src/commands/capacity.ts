import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { ChallongeTournament } from "../database/orm";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:capacity");

const command: CommandDefinition = {
	name: "capacity",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id, rawCapacity] = args; // 1 optional and thus potentially undefined
		let capacity = parseInt(rawCapacity, 10);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "capacity",
				capacity
			})
		);
		if (rawCapacity && (isNaN(capacity) || capacity < 0 || `${capacity}` !== rawCapacity)) {
			throw new UserError("The second parameter (tournament capacity) must be a whole number!");
		}
		if (capacity > 256) {
			capacity = 0;
		}
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.PREPARING
		);
		if (rawCapacity) {
			await ChallongeTournament.createQueryBuilder()
				.update()
				.set({ participantLimit: capacity })
				.where({ tournamentId: id })
				.execute();
			await msg.reply(`Set the capacity for **${tournament.name}** to _${capacity}_.`);
		} else {
			await msg.reply(`**${tournament.name}** capacity: _${tournament.limit || 256}_`);
		}
	}
};

export default command;
