import { Client } from "eris";
import { discordToken, challongeUsername, challongeToken } from "../config/env";
import { prefix, toRole } from "../config/config.json";
import logger from "../logger";
import { ChallongeV1Fetch } from "../challonge";
import RoleProvider from "./role";
import CommandDispatcher from "./dispatch";
import EmceeListener from "./events";
import ParticipantController from "../controllers/participant";
import PermissionController from "../controllers/permission";
import RoundController from "../controllers/round";
import TournamentController from "../controllers/tournament";

const checkEmoji = "✅";
const bot = new Client(discordToken);
const challonge = new ChallongeV1Fetch(challongeUsername, challongeToken);
const tournamentRoleFactory = (challongeId: string) => new RoleProvider(`MC-Tournament-${challongeId}`, 0xe67e22);
const dispatcher = new CommandDispatcher(
	prefix,
	bot.getChannel.bind(bot),
	bot.getDMChannel.bind(bot),
	new RoleProvider(toRole, 0x3498db),
	new ParticipantController(challonge, tournamentRoleFactory),
	new PermissionController(challonge),
	new RoundController(challonge, tournamentRoleFactory),
	new TournamentController(challonge, checkEmoji)
);
const listener = new EmceeListener(bot, dispatcher, checkEmoji);

bot.on("ready",                 listener.ready.bind(listener));
bot.on("guildCreate",           listener.guildCreate.bind(listener));
bot.on("messageCreate",         listener.messageCreate.bind(listener));
bot.on("messageDelete",         listener.messageDelete.bind(listener));
bot.on("messageReactionAdd",    listener.messageReactionAdd.bind(listener));
bot.on("messageReactionRemove", listener.messageReactionRemove.bind(listener));

bot.connect().catch(logger.error);
