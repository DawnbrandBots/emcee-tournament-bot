import { Guild, Member, MemberPartial } from "eris";
import { CommandSupport } from "../Command";
import { DiscordInterface } from "../discord/interface";
import { BlockedDMsError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("guildMemberRemove");

type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;

/**
 * Helper function to send the same message to the list of channels and
 * send any exceptions to the logger.
 * @nothrow
 */
async function messageChannels(
	discord: DiscordInterface,
	channels: string[],
	...args: Tail<Parameters<DiscordInterface["sendMessage"]>>
): Promise<void> {
	for (const channel of channels) {
		await discord.sendMessage(channel, ...args).catch(logger.error);
	}
}

export function makeHandler({ database, discord, challonge }: CommandSupport) {
	return async function guildMemberRemove(server: Guild, member: Member | MemberPartial): Promise<void> {
		if (member.user.bot) {
			return;
		}
		// Remove Participant from every preparing or in progress tournament in the database
		const dropped = await database.dropFromAll(server.id, member.id).catch(logger.error);
		if (!dropped || !dropped.length) {
			return;
		}
		function log(payload: Record<string, unknown>): void {
			logger.verbose(JSON.stringify({ id: member.id, ...payload }));
		}
		log({
			server: server.id,
			name: server.name,
			username: `${member.user.username}#${member.user.discriminator}`,
			tournaments: dropped.map(({ tournamentId, challongeId }) => ({ tournamentId, challongeId }))
		});
		const who = `<@${member.id}> (${member.user.username}#${member.user.discriminator})`;
		for (const { tournamentId, privateChannels, challongeId } of dropped) {
			// For each tournament, inform the private channel that the user left and was dropped.
			await messageChannels(
				discord,
				privateChannels,
				`${who} dropped from **${tournamentId}** by leaving the server.`
			);
			// For each tournament in progress, update the scores and inform the opponent if needed.
			if (challongeId !== undefined) {
				// modified from TournamentManager.sendDropMessage
				const match = await challonge.findClosedMatch(tournamentId, challongeId);
				// if there's no match, the dropping player had the natural bye
				if (match) {
					const oppChallonge = match.player1 === challongeId ? match.player2 : match.player1;
					// for an open match, the dropping player concedes
					if (match.open) {
						try {
							await challonge.submitScore(tournamentId, match, oppChallonge, 2, 0);
							log({
								tournament: tournamentId,
								match: match.matchId,
								oppChallonge
							});
						} catch (error) {
							logger.error(error);
							await messageChannels(
								discord,
								privateChannels,
								`Error automatically submitting score for ${who} in **${tournamentId}**. Please manually override later.`
							);
							continue;
						}
						try {
							const { discordId } = await challonge.getPlayer(tournamentId, oppChallonge);
							log({
								tournament: tournamentId,
								match: match.matchId,
								oppChallonge,
								discordId
							});
							// Naive guard against non-snowflake values stored on Challonge somehow
							if (discordId.length && discordId[0] >= "0" && discordId[0] <= "9") {
								await discord.sendDirectMessage(
									discordId,
									`Your opponent ${who} has dropped from the tournament, conceding this round to you. You don't need to submit a score for this round.`
								);
							}
						} catch (error) {
							if (!(error instanceof BlockedDMsError)) {
								logger.error(error);
							}
							await messageChannels(
								discord,
								privateChannels,
								error instanceof BlockedDMsError
									? error.message
									: `Failed to get the opponent of ${who} in **${tournamentId}** from Challonge. Please tell them that their opponent dropped.`
							);
						}
					} else {
						// if the match is closed and the opponent has also dropped, the score is amended to a tie
					}
				}
				try {
					await challonge.removePlayer(tournamentId, challongeId);
				} catch (e) {
					logger.error(e);
					await messageChannels(
						discord,
						privateChannels,
						`FATAL: could not remove ${who} from **${tournamentId}** on Challonge. Please report this bug.`
					);
				}
			}
		}
	};
}
