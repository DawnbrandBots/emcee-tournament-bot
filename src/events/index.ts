import { Client } from "eris";
import { CommandSupport } from "../Command";
import * as commands from "../commands";
import * as messageCreate from "./messageCreate";

export function registerEvents(bot: Client, prefix: string, support: CommandSupport): void {
	bot.on("messageCreate", messageCreate.makeHandler(bot, prefix, commands, support));
}
