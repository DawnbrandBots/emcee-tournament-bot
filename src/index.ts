import { CommandHandler } from "./commandHandler";
import { discord } from "./discord";
import logger from "./logger";
import { tournamentManager } from "./tournamentManager";

new CommandHandler(discord, tournamentManager, logger);
