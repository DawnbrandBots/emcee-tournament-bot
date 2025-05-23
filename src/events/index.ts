import { Client, DiscordAPIError, RESTEvents, RESTJSONErrorCodes } from "discord.js";
import { CommandSupport } from "../Command";
import * as commands from "../commands";
import { Participant, RegisterMessage } from "../database/orm";
import { dropPlayerChallonge } from "../drop";
import { serializeServer } from "../util";
import { send } from "../util/discord";
import { getLogger } from "../util/logger";
import * as guildCreate from "./guildCreate";
import * as guildMemberRemove from "./guildMemberRemove";
import * as interaction from "./interaction";
import * as messageCreate from "./messageCreate";
import * as messageDelete from "./messageDelete";

const logger = getLogger("events");

export function registerEvents(bot: Client, prefix: string, support: CommandSupport): void {
	bot.rest.on(RESTEvents.Debug, info => logger.verbose(RESTEvents.Debug, info));
	bot.rest.on(RESTEvents.RateLimited, rateLimitInfo => logger.warn(RESTEvents.RateLimited, rateLimitInfo));
	bot.on("warn", logger.warn);
	bot.on("error", logger.error);
	bot.on("shardReady", shard => logger.notify(`Shard ${shard} ready`));
	bot.on("shardReconnecting", shard => logger.info(`Shard ${shard} reconnecting`));
	bot.on("shardResume", (shard, replayed) => logger.info(`Shard ${shard} resumed: ${replayed} events replayed`));
	// TODO: remove curly braces when updated to TS 5.0+: https://github.com/microsoft/TypeScript/issues/52152
	bot.on("shardDisconnect", (event, shard) => {
		logger.notify(`Shard ${shard} disconnected (${event.code})`);
	});
	bot.on("shardError", (error, shard) => logger.error(`Shard ${shard} error:`, error));
	bot.on("guildDelete", guild => logger.notify(`Guild delete: ${serializeServer(guild)}`));
	bot.on("guildCreate", guildCreate.makeHandler(support.organiserRole));
	bot.on("interactionCreate", interaction.makeHandler(support));
	bot.on("messageCreate", messageCreate.makeHandler(bot, prefix, commands, support));
	bot.on("guildMemberRemove", guildMemberRemove.makeHandler(support));
	bot.on("messageDelete", messageDelete.makeHandler(bot, support));
	bot.on("messageReactionAdd", async (reaction, user) => {
		// reaction.me is true if the message is cached AND the bot reacted with the same emoji
		if (user.id !== bot.user?.id && reaction.emoji.name === "✅") {
			// TODO: all error logging lacks context
			// TODO: async lock
			if (
				await support.database
					.getRegisterMessage(reaction.message.channelId, reaction.message.id)
					.catch(error => void logger.error(error))
			) {
				const tournaments = await support.database.getPendingTournaments(user.id);
				if (tournaments.length > 0) {
					await reaction.users.remove(user.id).catch(logger.warn);
					await user
						.send(
							`You can only sign up for one tournament at a time! Please either drop from or complete your registration for **${tournaments[0].name}**!`
						)
						.catch(logger.info);
					// TODO: we cannot get the tournament by the current register message to inform the hosts
					return;
				}
				const tournament = await support.database
					.addPendingPlayer(reaction.message.channelId, reaction.message.id, user.id)
					.catch(error => void logger.error(error));
				if (tournament) {
					try {
						await user.send(
							`You are registering for **${tournament.name}**. ` +
								"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
						);
						logger.verbose(`User ${user.id} registered for tournament ${tournament.id}.`);
					} catch (e) {
						if (
							e instanceof DiscordAPIError &&
							e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
						) {
							for (const channel of tournament.privateChannels) {
								await send(
									bot,
									channel,
									`${user} (${user.username}) is trying to sign up for **${tournament.name}** (${tournament.id}), but I cannot send them DMs. Please ask them to allow DMs from this server.)`
								).catch(logger.error);
							}
						} else {
							logger.error(e);
						}
					}
				}
			}
		}
	});
	bot.on("messageReactionRemove", async (reaction, user) => {
		if (user.id !== bot.user?.id && reaction.emoji.name === "✅") {
			// TODO: async lock
			const participant = await Participant.createQueryBuilder()
				.where({ discordId: user.id })
				.innerJoinAndSelect(RegisterMessage, "M", "M.tournamentId = Participant.tournamentId")
				.andWhere("M.channelId = :channelId AND M.messageId = :messageId", {
					channelId: reaction.message.channelId,
					messageId: reaction.message.id
				})
				.leftJoinAndSelect("Participant.tournament", "tournament")
				.leftJoinAndSelect("Participant.confirmed", "confirmed")
				.getOne()
				.catch(error => void logger.error(error));
			if (!participant) {
				logger.verbose(
					JSON.stringify({
						channel: reaction.message.channelId,
						message: reaction.message.id,
						user: user.id,
						event: "drop reaction fail"
					})
				);
				return;
			}
			const log = (payload: Record<string, unknown>): void => {
				logger.verbose(
					JSON.stringify({
						channel: reaction.message.channelId,
						message: reaction.message.id,
						user: user.id,
						tournament: participant?.tournamentId,
						...payload
					})
				);
			};
			if (participant.confirmed) {
				if (
					await dropPlayerChallonge(
						participant.tournamentId,
						participant.tournament.privateChannels,
						participant.tournament.status,
						participant.confirmed.challongeId,
						`${user}`,
						log,
						reaction.client,
						support.challonge,
						support.database
					)
				) {
					try {
						await support.participantRole.ungrant(user.id, {
							id: participant.tournamentId,
							server: participant.tournament.owningDiscordServer
						});
					} catch (error) {
						logger.info(error);
						for (const channel of participant.tournament.privateChannels) {
							await send(
								bot,
								channel,
								`Failed to remove **${participant.tournament.name}** participant role from ${user}.`
							).catch(logger.error);
						}
					}
				} else {
					for (const channel of participant.tournament.privateChannels) {
						await send(
							bot,
							channel,
							`Something went wrong on Challonge with dropping ${user} from **${participant.tournament.name}** upon request. Please try again later.`
						).catch(logger.error);
					}
					await user
						.send(
							`Something went wrong with dropping from **${participant.tournament.name}**. Please try again later or ask your hosts how to proceed.`
						)
						.catch(logger.info);
					return;
				}
			}
			const confirmed = !!participant.confirmed;
			try {
				await participant.remove();
			} catch (error) {
				logger.error(error);
				for (const channel of participant.tournament.privateChannels) {
					await send(
						bot,
						channel,
						`Failed to drop ${user} from **${participant.tournament.name}** upon request. Please try again later.`
					).catch(logger.error);
				}
				await user
					.send(
						`Something went wrong with dropping from **${participant.tournament.name}**. Please try again later or ask your hosts how to proceed.`
					)
					.catch(logger.info);
				return;
			}
			log({ event: "success" });
			if (confirmed) {
				for (const channel of participant.tournament.privateChannels) {
					await send(bot, channel, `**${participant.tournament.name}** drop: ${user}`).catch(logger.error);
				}
			}
			await user.send(`You have dropped from **${participant.tournament.name}**.`).catch(logger.info);
		}
	});
}
