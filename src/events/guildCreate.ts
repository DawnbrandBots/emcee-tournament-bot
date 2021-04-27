import { Guild } from "eris";
import { OrganiserRoleProvider } from "../role/organiser";
import { getLogger } from "../util/logger";

const logger = getLogger("guildCreate");

export function makeHandler(organiserRole: OrganiserRoleProvider) {
	return async function guildCreate(server: Guild): Promise<void> {
		logger.notify(`${server.id}: ${server.name}`);
		await organiserRole.create(server).catch(logger.error);
	};
}
