import { CommandDefinition } from "../Command";
import { TournamentStatus } from "../database/interface";
import { Participant } from "../database/orm";
import { dropPlayerChallonge } from "../drop";
import { removeReaction } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:drop");

const command: CommandDefinition = {
	name: "drop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id] = args;
		const participant = await Participant.findOne({
			where: { tournamentId: id, discordId: msg.author.id },
			relations: ["tournament"]
		});
		function log(payload: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author.id,
					server: msg.guildId,
					tournament: id,
					tournamentServer: participant?.tournament.owningDiscordServer,
					command: "drop",
					...payload
				})
			);
		}
		log({ event: "attempt" });
		if (!participant || (msg.guildId && msg.guildId !== participant.tournament.owningDiscordServer)) {
			await msg.reply(
				`I couldn't find you in the __${id}__ tournament. Are you sure that the name is correct and you're registered?`
			);
			return;
		}
		if (participant.tournament.status === TournamentStatus.COMPLETE) {
			log({ event: "already complete" });
			await msg.reply(`**${participant.tournament.name}** has already concluded!`);
			return;
		}
		const who = `<@${msg.author.id}> (${msg.author.username}#${msg.author.discriminator})`;
		if (participant.confirmed) {
			if (
				await dropPlayerChallonge(
					id,
					participant.tournament.privateChannels,
					participant.tournament.status,
					participant.confirmed.challongeId,
					who,
					log,
					support.discord,
					support.challonge,
					support.database
				)
			) {
				try {
					await support.participantRole.ungrant(msg.author.id, {
						id,
						server: participant.tournament.owningDiscordServer
					});
				} catch (error) {
					logger.warn(error);
					for (const channel of participant.tournament.privateChannels) {
						await support.discord
							.sendMessage(
								channel,
								`Failed to remove **${participant.tournament.name}** participant role from ${who}.`
							)
							.catch(logger.error);
					}
				}
			} else {
				await msg.reply("Something went wrong. Please try again later or ask your hosts how to proceed.");
				return;
			}
		}
		const confirmed = !!participant.confirmed;
		try {
			await participant.remove();
		} catch (error) {
			logger.error(error);
			for (const channel of participant.tournament.privateChannels) {
				await support.discord
					.sendMessage(
						channel,
						`Failed to drop ${who} from **${participant.tournament.name}** upon request. Please try again later.`
					)
					.catch(logger.error);
			}
			await msg.reply("Something went wrong. Please try again later or ask your hosts how to proceed.");
			return;
		}
		log({ event: "success" });
		if (confirmed) {
			for (const channel of participant.tournament.privateChannels) {
				await support.discord
					.sendMessage(channel, `**${participant.tournament.name}** drop: ${who}`)
					.catch(logger.error);
			}
		}
		await msg.reply(`You have dropped from **${participant.tournament.name}**.`);
		if (participant.tournament.status === TournamentStatus.PREPARING) {
			const messages = await support.database.getRegisterMessages(id);
			for (const m of messages) {
				await removeReaction(msg.client, m.channelId, m.messageId, "✅", msg.author.id).catch(logger.info);
			}
		}
	}
};

export default command;
