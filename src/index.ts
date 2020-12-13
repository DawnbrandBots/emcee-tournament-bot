import { CommandHandler } from "./CommandHandler";
import logger from "./logger";

import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { prefix } from "./config/config.json";

import { DatabaseInterface } from "./database/interface";
import { DatabaseWrapperMongoose } from "./database/mongoose";

import { WebsiteInterface } from "./website/interface";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { challongeUsername, challongeToken } from "./config/env";

import { TournamentManager } from "./TournamentManager";

import { Timer } from "./timer/Timer";

const eris = new DiscordWrapperEris(logger);
const discord = new DiscordInterface(eris, prefix, logger);

const mongoose = new DatabaseWrapperMongoose();
const database = new DatabaseInterface(mongoose);

const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
const website = new WebsiteInterface(challonge);

const tournamentManager = new TournamentManager(discord, database, website, logger, Timer);

new CommandHandler(discord, tournamentManager, logger);
