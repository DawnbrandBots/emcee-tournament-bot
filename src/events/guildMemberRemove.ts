import { Guild, Member, MemberPartial } from "eris";
import { DatabaseWrapperPostgres } from "../database/postgres";
import { DiscordInterface } from "../discord/interface";
import { BlockedDMsError } from "../util/errors";
import { getLogger } from "../util/logger";
import { WebsiteInterface } from "../website/interface";

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

export function makeHandler(database: DatabaseWrapperPostgres, discord: DiscordInterface, website: WebsiteInterface) {
	return async function guildMemberRemove(server: Guild, member: Member | MemberPartial): Promise<void> {
		if (member.user.bot) {
			return;
		}
		// Remove Participant from every preparing or in progress tournament in the database
		const dropped = await database.dropFromAll(server.id, member.id).catch(logger.error);
		if (!dropped || !dropped.length) {
			return;
		}
		logger.verbose(
			JSON.stringify({
				server: server.id,
				name: server.name,
				id: member.id,
				username: `${member.user.username}#${member.user.discriminator}`,
				tournaments: dropped.map(({ tournamentId, challongeId }) => ({ tournamentId, challongeId }))
			})
		);
		const who = `<@${member.id}> (${member.user.username}#${member.user.discriminator})`;
		for (const { tournamentId, privateChannels, challongeId } of dropped) {
			// For each tournament, inform the private channel that the user left and was dropped.
			await messageChannels(
				discord,
				privateChannels,
				`${who} dropped from **${tournamentId}** by leaving the server.`
			);
			// For each tournament in progress, inform the opponent that their opponent dropped
			if (challongeId !== undefined) {
				// modified from TournamentManager.sendDropMessage
				const match = await website.findMatch(tournamentId, challongeId);
				// if there's no match, their most recent score is already submitted.
				if (match) {
					const oppChallonge = match.player1 === challongeId ? match.player2 : match.player1;
					try {
						await website.submitScore(tournamentId, match, oppChallonge, 2, 0);
						logger.verbose(
							JSON.stringify({
								id: member.id,
								tournament: tournamentId,
								match: match.matchId,
								oppChallonge
							})
						);
						const { discordId } = await website.getPlayer(tournamentId, oppChallonge);
						logger.verbose(
							JSON.stringify({
								id: member.id,
								tournament: tournamentId,
								match: match.matchId,
								oppChallonge,
								discordId
							})
						);
						if (discordId !== "DUMMY") {
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
								: `Error automatically submitting score for ${who} in **${tournamentId}**. Please manually override later.`
						);
					}
				}
				try {
					await website.removePlayer(tournamentId, challongeId);
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
