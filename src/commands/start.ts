import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:start");

const command: CommandDefinition = {
	name: "start",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Argument combinations:
		// id
		// id|timer
		// id|skip
		// id|timer|skip
		// 50 is the assumed default timer for live tournaments
		const [id] = args;
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.PREPARING
		);
		function log(event: string, payload?: Record<string, unknown>): string {
			return JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "start",
				event,
				...payload
			});
		}
		logger.verbose(log("attempt"));
		if (tournament.players.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		try {
			const { registerMessages, ejected } = await support.database.prestartTournament(id);
			logger.info(log("prestart"));
			for (const { channelId, messageId } of registerMessages) {
				await support.discord.deleteMessage(channelId, messageId).catch(logger.warn); // TODO: audit log reason
			}
			logger.verbose(log("delete register messages"));
			for (const player of ejected) {
				await support.discord
					.sendDirectMessage(
						player,
						`Sorry, **${tournament.name}** has started and you didn't submit a deck, so you have been dropped.`
					)
					.catch(logger.warn);
			}
			logger.verbose(log("notify ejected"));
			await support.challonge.shufflePlayers(id); // must happen before byes assigned!
			logger.verbose(log("shuffle players"));
			await support.challonge.assignByes(id, tournament.byes);
			logger.info(log("assign byes"));
			await support.challonge.startTournament(id);
			logger.info(log("challonge"));
			await support.database.startTournament(id);
			logger.verbose(log("database"));
			await msg.reply(
				`**${tournament.name}** commenced on Challonge! Use \`mc!round ${id}\` to send out pairings and start the timer for round 1.`
			);
		} catch (err) {
			logger.error(err);
			await msg.reply(`Something went wrong in preflight for **${tournament.name}**. Please try again later.`);
			return;
		}
		// send command guide to players
		for (const channel of tournament.publicChannels) {
			await support.discord.sendMessage(channel, support.templater.format("player", id)).catch(logger.error);
		}
		logger.verbose(log("public"));
		// send command guide to hosts
		for (const channel of tournament.privateChannels) {
			await support.discord.sendMessage(channel, support.templater.format("start", id)).catch(logger.error);
		}
		logger.verbose(log("private"));
		// drop dummy players once the tournament has started to give players with byes the win
		await support.challonge.dropByes(id, tournament.byes.length);
		logger.info(log("success"));
	}
};

export default command;
