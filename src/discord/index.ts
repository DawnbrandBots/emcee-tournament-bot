import logger from "../logger";
import { DiscordWrapperEris } from "./eris";
import { DiscordInterface } from "./interface";
import { prefix } from "../config/config.json";

const eris = new DiscordWrapperEris(logger);
export const discord = new DiscordInterface(eris, prefix, logger);
