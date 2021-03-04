import { CommandDefinition } from "../Command";
import { Participant } from "../database/orm";
import { dropPlayerChallonge } from "../drop";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:drop");

const command: CommandDefinition = {
	name: "drop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id] = args;
		const participant = await Participant.findOne({ tournamentId: id, discordId: msg.author.id });
		function log(payload: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channel.id,
					message: msg.id,
					user: msg.author.id,
					tournament: id,
					command: "drop",
					...payload
				})
			);
		}
		log({ event: "attempt" });
		if (!participant) {
			await reply(msg, `You are not signed up for __${id}__ or that tournament doesn't exist!`);
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
				await reply(msg, "Something went wrong. Please try again later or ask your hosts how to proceed.");
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
			await reply(msg, "Something went wrong. Please try again later or ask your hosts how to proceed.");
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
		await reply(msg, `You have dropped from **${participant.tournament.name}**.`);
	}
};

export default command;
