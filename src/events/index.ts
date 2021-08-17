import { Client } from "discord.js";
import { CommandSupport } from "../Command";
import * as commands from "../commands";
import { serializeServer } from "../util";
import { getLogger } from "../util/logger";
import * as guildCreate from "./guildCreate";
import * as guildMemberRemove from "./guildMemberRemove";
import * as messageCreate from "./messageCreate";

const logger = getLogger("events");

export function registerEvents(bot: Client, prefix: string, support: CommandSupport): void {
	bot.on("warn", logger.warn);
	bot.on("error", logger.error);
	bot.on("shardReady", shard => logger.notify(`Shard ${shard} ready`));
	bot.on("shardReconnecting", shard => logger.notify(`Shard ${shard} reconnecting`));
	bot.on("shardResume", (shard, replayed) => logger.notify(`Shard ${shard} resumed: ${replayed} events replayed`));
	bot.on("shardDisconnect", (event, shard) =>
		logger.notify(`Shard ${shard} disconnected (${event.code},${event.wasClean}): ${event.reason}`)
	);
	bot.on("shardError", (error, shard) => logger.error(`Shard ${shard} error:`, error));
	bot.on("guildDelete", guild => logger.notify(`Guild delete: ${serializeServer(guild)}`));
	bot.on("guildCreate", guildCreate.makeHandler(support.organiserRole));
	bot.on("messageCreate", messageCreate.makeHandler(bot, prefix, commands, support));
	bot.on("guildMemberRemove", guildMemberRemove.makeHandler(support));
	bot.on("messageDelete", message => support.database.cleanRegistration(message.channelId, message.id));
}
