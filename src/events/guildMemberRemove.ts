import { Guild, Member, MemberPartial } from "discord.js";
import { getConnection } from "typeorm";
import { CommandSupport } from "../Command";
import { Participant } from "../database/orm";
import { DiscordInterface } from "../discord/interface";
import { dropPlayerChallonge } from "../drop";
import { getLogger } from "../util/logger";
import { Tail } from "../util/types";

const logger = getLogger("guildMemberRemove");

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
		await getConnection()
			.transaction(async entityManager => {
				// Prepare to remove Participant from every preparing or in progress tournament in the database
				const dropped = await entityManager
					.getRepository(Participant)
					.createQueryBuilder()
					// Fill in the tournament relation while filtering only for the relevant tournaments.
					.innerJoinAndSelect(
						"Participant.tournament",
						"T",
						"(T.status = 'preparing' OR T.status = 'in progress') AND T.owningDiscordServer = :server AND Participant.discordId = :playerId",
						{ server: server.id, playerId: member.id }
					)
					// Fill in the confirmed relation if possible.
					.leftJoinAndSelect("Participant.confirmed", "confirmed")
					.getMany();
				if (!dropped.length) {
					return;
				}
				function log(payload: Record<string, unknown>): void {
					logger.verbose(JSON.stringify({ id: member.id, ...payload }));
				}
				log({
					server: server.id,
					name: server.name,
					username: `${member.user.username}#${member.user.discriminator}`,
					tournaments: dropped.map(({ tournamentId, confirmed }) => ({
						tournamentId,
						challongeId: confirmed?.challongeId
					}))
				});
				const who = `<@${member.id}> (${member.user.username}#${member.user.discriminator})`;
				for (const participant of dropped) {
					// For each tournament, inform the private channel that the user left and was dropped.
					await messageChannels(
						discord,
						participant.tournament.privateChannels,
						`${who} dropped from **${participant.tournamentId}** by leaving the server.`
					);
					if (participant.confirmed) {
						if (
							await dropPlayerChallonge(
								participant.tournamentId,
								participant.tournament.privateChannels,
								participant.tournament.status,
								participant.confirmed.challongeId,
								who,
								log,
								discord,
								challonge,
								database
							)
						) {
							await entityManager.remove(participant);
						}
					}
				}
			})
			.catch(logger.error);
	};
}
