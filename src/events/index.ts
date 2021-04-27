import { Client } from "eris";
import { CommandSupport } from "../Command";
import * as commands from "../commands";
import { getLogger } from "../util/logger";
import * as guildCreate from "./guildCreate";
import * as guildMemberRemove from "./guildMemberRemove";
import * as messageCreate from "./messageCreate";

const logger = getLogger("events");

export function registerEvents(bot: Client, prefix: string, support: CommandSupport): void {
	bot.on("warn", (message, shard) => logger.warn(`Shard ${shard}: ${message}`));
	bot.on("error", (message, shard) => logger.error(`Shard ${shard}: ${message}`));
	bot.on("connect", shard => logger.notify(`Shard ${shard} connected to Discord`));
	bot.on("disconnect", () => logger.notify("Disconnected from Discord"));
	bot.on("shardReady", shard => logger.notify(`Shard ${shard} ready`));
	bot.on("shardDisconnect", shard => logger.notify(`Shard ${shard} disconnected`));
	bot.on("guildDelete", guild => logger.notify(`Guild delete: ${guild}`));
	bot.on("guildCreate", guildCreate.makeHandler(support.organiserRole));
	bot.on("messageCreate", messageCreate.makeHandler(bot, prefix, commands, support));
	bot.on("guildMemberRemove", guildMemberRemove.makeHandler(support));
}
