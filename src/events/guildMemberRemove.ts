import { Guild, Member, MemberPartial } from "eris";
import { DatabaseWrapperPostgres } from "../database/postgres";
import { DiscordInterface } from "../discord/interface";
import { BlockedDMsError } from "../util/errors";
import { getLogger } from "../util/logger";
import { WebsiteInterface } from "../website/interface";

const logger = getLogger("guildMemberRemove");

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
			for (const channel of privateChannels) {
				await discord
					.sendMessage(channel, `${who} dropped from **${tournamentId}** by leaving the server.`)
					.catch(logger.error);
			}
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
						await discord.sendDirectMessage(
							"OPPONENT DISCORD ID",
							`Your opponent ${who} has dropped from the tournament, conceding this round to you. You don't need to submit a score for this round.`
						);
					} catch (error) {
						if (!(error instanceof BlockedDMsError)) {
							logger.error(error);
						}
						for (const channel of privateChannels) {
							await discord
								.sendMessage(
									channel,
									error instanceof BlockedDMsError
										? error.message
										: `Error automatically submitting score for ${who} in **${tournamentId}**. Please manually override later.`
								)
								.catch(logger.error);
						}
					}
				}
			}
		}
	};
}
