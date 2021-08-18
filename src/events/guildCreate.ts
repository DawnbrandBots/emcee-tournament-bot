import { Guild } from "discord.js";
import { OrganiserRoleProvider } from "../role/organiser";
import { serializeServer } from "../util";
import { getLogger } from "../util/logger";

const logger = getLogger("guildCreate");

export function makeHandler(organiserRole: OrganiserRoleProvider) {
	return async function guildCreate(server: Guild): Promise<void> {
		logger.notify(serializeServer(server));
		await organiserRole.create(server).catch(logger.error);
	};
}
