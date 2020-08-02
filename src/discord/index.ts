import { Client } from "eris";
import { discordToken, challongeUsername, challongeToken } from "../config/env";
import { prefix, toRole } from "../config/config.json";
import logger from "../logger";
import { ChallongeV1Fetch } from "../challonge";
import CommandDispatcher from "./dispatch";
import EmceeListener from "./events";
import ParticipantController from "../controllers/participant";
import PermissionController from "../controllers/permission";
import RoundController from "../controllers/round";
import TournamentController from "../controllers/tournament";
import RoleProvider from "./role";

const checkEmoji = "✅";
const bot = new Client(discordToken);
const challonge = new ChallongeV1Fetch(challongeUsername, challongeToken);
const dispatcher = new CommandDispatcher(
	prefix,
	bot.getChannel.bind(bot),
	new RoleProvider(toRole, 0x3498db),
	new ParticipantController(challonge),
	new PermissionController(challonge),
	new RoundController(challonge),
	new TournamentController(challonge)
);
const listener = new EmceeListener(bot, dispatcher, checkEmoji);

bot.on("ready",                 listener.ready.bind(listener));
bot.on("guildCreate",           listener.guildCreate.bind(listener));
bot.on("messageCreate",         listener.messageCreate.bind(listener));
bot.on("messageDelete",         listener.messageDelete.bind(listener));
bot.on("messageReactionAdd",    listener.messageReactionAdd.bind(listener));
bot.on("messageReactionRemove", listener.messageReactionRemove.bind(listener));

bot.connect().catch(logger.error);
