import { Util } from "discord.js";
import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { send } from "../util/discord";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:score");

const command: CommandDefinition = {
	name: "score",
	requiredArgs: ["id", "score"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id, score] = args;
		const scores = score.split("-").map(s => parseInt(s, 10));
		if (scores.length !== 2) {
			throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
		}
		// Check command syntax first to avoid a database round trip
		function log(event: string, extra?: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "score",
					scores,
					event,
					...extra
				})
			);
		}
		const player = await support.database.authenticatePlayer(id, msg.author.id, msg.guildId, TournamentStatus.IPR);
		const match = await support.challonge.findMatch(id, player.challongeId);
		if (!match) {
			log("no match");
			await msg.reply(
				`Could not find an open match in **${player.tournament.name}** including ${msg.author}. This could mean your opponent dropped, conceding the match. If the score for your current match is incorrect, please ask a host to change it.`
			);
			return;
		}

		const pendingScore = support.scores.get(id)?.get(match.matchId);
		if (pendingScore) {
			if (pendingScore.playerId === player.challongeId) {
				log("duplicate");
				await msg.reply(
					`You have already reported your score for this match, <@${msg.author.id}>. Please have your opponent confirm the score.`
				);
				return;
			}
			const opponent = await msg.client.users.fetch(pendingScore.playerDiscord);
			if (scores[0] === pendingScore.oppScore && scores[1] === pendingScore.playerScore) {
				// The scores match, so we submit to Challonge
				const weWon = scores[0] > scores[1];
				// in the case of a tie, winnerScore and loserScore will turn out the same
				const winner = weWon ? player.challongeId : pendingScore.playerId;
				const winnerScore = weWon ? scores[0] : scores[1];
				const loserScore = weWon ? scores[1] : scores[0];
				log("submit", { winner, winnerScore, loserScore });
				try {
					await support.challonge.submitScore(id, match, winner, winnerScore, loserScore);
				} catch (err) {
					await msg.reply(
						`Unexpected error submitting a score to Challonge for ${msg.author}. Please report this and try again later.`
					);
					throw err;
				}
				// Notify the opponent, but don't fail the command if we can't
				try {
					await opponent.send(
						`Your opponent has successfully confirmed your score of ${scores[1]}-${scores[0]} for **${player.tournament.name}**, so the score has been saved. Thank you.`
					);
				} catch (err) {
					log("DM fail", { opponent: opponent.id });
					logger.info(err);
					for (const channel of player.tournament.privateChannels) {
						await send(
							msg.client,
							channel,
							`Failed to send confirmation of score submission to ${opponent}.`
						).catch(logger.error);
					}
				}
				// Inform the hosts
				try {
					log("notify", { callerUsername: msg.author.tag, opponentUsername: opponent.tag });
					const callerTag = Util.escapeMarkdown(msg.author.tag);
					const oppTag = Util.escapeMarkdown(opponent.tag);
					for (const channel of player.tournament.privateChannels) {
						await send(
							msg.client,
							channel,
							`${msg.author} (${callerTag}) and ${opponent} (${oppTag}) have reported their score of ${scores[0]}-${scores[1]} for **${player.tournament.name}** (${id}).`
						);
					}
				} catch (err) {
					logger.error(err);
				}
				// Notify the caller
				await msg.reply(
					`You have successfully reported a score of ${scores[0]}-${scores[1]}, and it matches your opponent's report, so the score has been saved. Thank you, ${msg.author}.`
				);
			} else {
				// Notify the opponent, but don't fail the command if we can't
				try {
					await opponent.send(
						`Your opponent submitted a different score of ${scores[1]}-${scores[0]} for **${player.tournament.name}**. Both of you will need to report again.`
					);
				} catch (err) {
					log("DM fail", { opponent: opponent.id });
					logger.info(err);
					for (const channel of player.tournament.privateChannels) {
						await send(
							msg.client,
							channel,
							`Failed to send report of score disagreement to <@${opponent}>.`
						).catch(logger.error);
					}
				}
				await msg.reply(
					`Your score does not match your opponent's reported score of ${pendingScore.oppScore}-${pendingScore.playerScore}. Both of you will need to report again.`
				);
			}
			// Whether the scores match or not, remove the pending score
			support.scores.get(id)?.delete(match.matchId);
		} else {
			if (!support.scores.has(id)) {
				support.scores.set(id, new Map());
			}
			support.scores.get(id)?.set(match.matchId, {
				playerId: player.challongeId,
				playerDiscord: msg.author.id,
				playerScore: scores[0],
				oppScore: scores[1]
			});
			log("pending");
			await msg.reply(
				`You have reported a score of ${scores[0]}-${scores[1]}, <@${msg.author.id}>. Your opponent still needs to confirm this score. If you want to drop, please wait for your opponent to confirm or you will concede 0-2.`
			);
		}
	}
};

export default command;
