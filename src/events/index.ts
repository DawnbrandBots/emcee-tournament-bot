import { Client } from "eris";
import { CommandSupport } from "../Command";
import * as commands from "../commands";
import { getLogger } from "../util/logger";
import * as guildCreate from "./guildCreate";
import * as messageCreate from "./messageCreate";

const logger = getLogger("events");

export function registerEvents(bot: Client, prefix: string, support: CommandSupport): void {
	bot.on("warn", (message, shard) => logger.warn(`Shard ${shard}: ${message}`));
	bot.on("error", (message, shard) => logger.error(`Shard ${shard}: ${message}`));
	bot.on("connect", shard => logger.info(`Shard ${shard} connected to Discord`));
	bot.on("disconnect", () => logger.info("Disconnected from Discord"));
	bot.on("shardReady", shard => logger.info(`Shard ${shard} ready`));
	bot.on("shardDisconnect", shard => logger.info(`Shard ${shard} disconnected`));
	bot.on("guildDelete", guild => logger.info(`Guild delete: ${guild}`));
	bot.on("guildCreate", guildCreate.makeHandler(support.organiserRole));
	bot.on("messageCreate", messageCreate.makeHandler(bot, prefix, commands, support));
}
