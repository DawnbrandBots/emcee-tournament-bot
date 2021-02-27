import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:forcedrop");

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id", "who"],
	executor: async (msg, args, support) => {
		const [id, who] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id);
		const player = who.startsWith("<@!") && who.endsWith(">") ? who.slice(3, -1) : who;
		function log(payload: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "forcedrop",
					...payload
				})
			);
		}
		log({ player, event: "attempt" });
		const challongeId = await support.database.dropPlayer(id, player);
		const username = await support.discord.getRESTUsername(player);
		log({ player, challongeId, username });
		const name = username ? `<@${player}> (${username})` : who;
		if (challongeId === null) {
			await reply(msg, `${name} not found in **${tournament.name}**.`);
			return;
		}
		if (challongeId !== undefined) {
			// TODO: how does the failure path work here?
			// Concede match if the tournament is ongoing
			if (tournament.status === TournamentStatus.IPR) {
				log({ player, challongeId, event: "concede" });
				const match = await support.challonge.findClosedMatch(tournament.id, challongeId); // can also find open match
				log({ player, challongeId, match });
				// if there's no match, the dropping player had the natural bye
				if (match) {
					const oppChallonge = match.player1 === challongeId ? match.player2 : match.player1;
					const opponent = await support.database.getPlayerByChallonge(oppChallonge, id).catch<undefined>();
					log({ player, challongeId, oppId: opponent?.discordId, oppChallonge });
					// if the opponent isn't in our database, the dropping player had an artificial bye
					if (opponent) {
						// for an open match, the dropping player concedes
						if (match.open) {
							await support.challonge.submitScore(tournament.id, match, oppChallonge, 2, 0);
							log({ player, challongeId, event: "notify opponent" });
							await support.discord
								.sendDirectMessage(
									opponent.discordId,
									`Your opponent ${name} has dropped from the tournament, conceding this round to you. You don't need to submit a score for this round.`
								)
								.catch(logger.error);
						} else {
							// if the match is closed and the opponent has also dropped, the score needs to be amended to a tie
							// TODO: keep in mind when we change to tracking dropped players
							log({ player, challongeId, event: "double drop" });
							await support.challonge.submitScore(tournament.id, match, oppChallonge, 0, 0);
						}
					}
				}
			}
			// Either way, take the confirmed participant off of Challonge and the Discord role
			await support.challonge.removePlayer(tournament.id, challongeId);
			log({ player, challongeId, event: "challonge" });
			await support.participantRole.ungrant(player, tournament).catch(logger.error);
		}
		// Notify relevant parties as long as the participant existed
		await support.discord
			.sendDirectMessage(player, `You have been dropped from **${tournament.name}** by the hosts.`)
			.catch(logger.error);
		for (const channel of tournament.privateChannels) {
			await support.discord
				.sendMessage(channel, `${name} has been forcefully dropped from **${tournament.name}**.`)
				.catch(logger.error);
		}
		await reply(
			msg,
			challongeId === undefined
				? `${name} was pending and dropped from **${tournament.name}**.`
				: `${name} successfully dropped from **${tournament.name}**.`
		);
		log({ player, event: "success" });
		const messages = await support.database.getRegisterMessages(id);
		for (const m of messages) {
			await support.discord.removeUserReaction(m.channelId, m.messageId, "✅", player);
		}
	}
};

export default command;
