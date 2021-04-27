import { PossiblyUncachedGuild } from "eris";

export function serializeServer(server: PossiblyUncachedGuild): string {
	if ("name" in server) {
		const createdAt = new Date(server.createdAt).toISOString();
		return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerID}>`;
	} else {
		return `${server.id}`;
	}
}
