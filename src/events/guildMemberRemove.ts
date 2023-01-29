import { escapeMarkdown, GuildMember, PartialGuildMember } from "discord.js";
import { getConnection } from "typeorm";
import { CommandSupport } from "../Command";
import { ManualParticipant, Participant } from "../database/orm";
import { dropPlayerChallonge } from "../drop";
import { dropPlayer } from "../slash/database";
import { send } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("guildMemberRemove");

export function makeHandler({ database, challonge }: CommandSupport) {
	return async function guildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
		const server = member.guild;
		if (member.user?.bot) {
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
					username: member.user?.tag,
					tournaments: dropped.map(({ tournamentId, confirmed }) => ({
						tournamentId,
						challongeId: confirmed?.challongeId
					}))
				});
				// eslint-disable-next-line prefer-template
				const who = `<@${member.id}> (` + escapeMarkdown(`${member.user?.tag}`) + ")";
				for (const participant of dropped) {
					// For each tournament, inform the private channel that the user left and was dropped.
					for (const channel of participant.tournament.privateChannels) {
						await send(
							member.client,
							channel,
							`${who} dropped from **${participant.tournamentId}** by leaving the server.`
						).catch(logger.error);
					}
					if (participant.confirmed) {
						if (
							await dropPlayerChallonge(
								participant.tournamentId,
								participant.tournament.privateChannels,
								participant.tournament.status,
								participant.confirmed.challongeId,
								who,
								log,
								member.client,
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
		const manualParticipants = await ManualParticipant.find({
			where: { discordId: member.id },
			relations: ["tournament"]
		});
		for (const participant of manualParticipants) {
			await dropPlayer(participant.tournament, participant, member);
		}
	};
}
