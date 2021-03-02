import { TournamentStatus } from "./database/interface";
import { DatabaseWrapperPostgres } from "./database/postgres";
import { DiscordInterface } from "./discord/interface";
import { BlockedDMsError } from "./util/errors";
import { getLogger } from "./util/logger";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("drop");

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

export async function dropPlayerChallonge(
	tournamentId: string,
	privateChannels: string[],
	status: TournamentStatus,
	challongeId: number,
	who: string,
	log: (payload: Record<string, unknown>) => void,
	discord: DiscordInterface,
	challonge: WebsiteInterface,
	database: DatabaseWrapperPostgres
): Promise<void> {
	// For each tournament in progress, update the scores and inform the opponent if needed.
	if (status === TournamentStatus.IPR) {
		// find last closed or open match
		const match = await challonge.findClosedMatch(tournamentId, challongeId).catch(logger.error);
		log({ tournamentId, match });
		// If there's no match, the dropping player had the natural bye.
		if (match) {
			const oppChallonge = match.player1 === challongeId ? match.player2 : match.player1;
			// For an open match, the dropping player concedes.
			if (match.open) {
				// Submit a 2-0 score in favour of the opponent. Warn hosts of any errors and skip to the next.
				try {
					await challonge.submitScore(tournamentId, match, oppChallonge, 2, 0);
					log({ tournamentId, matchId: match.matchId, oppChallonge });
				} catch (error) {
					logger.error(error);
					await messageChannels(
						discord,
						privateChannels,
						`Error automatically submitting score for ${who} in **${tournamentId}**. Please manually override later.`
					);
					return;
				}
				// Automatic match concession was successful, so inform the opponent and warn hosts of errors.
				try {
					const { discordId } = await challonge.getPlayer(tournamentId, oppChallonge);
					log({ tournamentId, matchId: match.matchId, oppChallonge, discordId });
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
				// If the match is closed AND the opponent has also dropped, the score is amended to a tie.
				// Do not direct message the former opponent but do warn hosts of any errors.
				// TODO: keep in mind when we change to tracking dropped players
				const opponent = await database.getPlayerByChallonge(oppChallonge, tournamentId).catch<void>();
				if (opponent) {
					log({ tournamentId, oppChallonge, discordId: opponent.discordId });
				} else {
					// This will tie scores against round-one byes if that ever happens.
					try {
						await challonge.submitScore(tournamentId, match, oppChallonge, 0, 0);
						log({ tournamentId, matchId: match.matchId, oppChallonge });
					} catch (error) {
						logger.error(error);
						await messageChannels(
							discord,
							privateChannels,
							`Error automatically resetting score for ${who} in **${tournamentId}**. Please manually override later.`
						);
						return;
					}
				}
			}
		}
	}
	// There was no problem submitting a score to Challonge or the tournament hasn't started yet, so drop the player from Challonge.
	try {
		await challonge.removePlayer(tournamentId, challongeId);
	} catch (error) {
		logger.error(error);
		await messageChannels(
			discord,
			privateChannels,
			`FATAL: could not remove ${who} from **${tournamentId}** on Challonge. Please report this bug.`
		);
	}
}
