import { Guild } from "discord.js";

export function serializeServer(server: Guild): string {
	const createdAt = new Date(server.createdAt).toISOString();
	return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerId}>`;
}
