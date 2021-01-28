import { Client, Guild, Role } from "eris";
import { MiscInternalError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("role:participant");

type ParticipantRole = {
	id: string;
	server: Guild;
};

type Tournament = {
	id: string;
	server: string;
};

// TODO: logging
// TODO: error handling for Discord API failures
// TODO: figure out how to store server objects, if we even should
export class ParticipantRoleProvider {
	protected roleCache: Record<string, ParticipantRole> = {};

	constructor(protected readonly bot: Client, readonly color?: number) {}

	private async create(server: Guild, tournamentId: string): Promise<Role> {
		// TODO: error handling?
		const role = await server.createRole(
			{
				name: `MC-${tournamentId}-player`,
				color: this.color
			},
			"Auto-created by Emcee."
		);
		logger.verbose(`Role ${role.name} (${role.id}) created in ${server.name} (${server.id}).`);
		return role;
	}

	public async get(tournament: Tournament): Promise<string> {
		if (tournament.id in this.roleCache) {
			return this.roleCache[tournament.id].id;
		}
		const server = this.bot.guilds.get(tournament.server);
		if (!server) {
			// This actually only checks if the server is in the cache
			throw new MiscInternalError(
				`Could not find server ${tournament.server} as registered with Tournament ${tournament.server}.`
			);
		}
		const role =
			server.roles.find(r => r.name === `MC-${tournament.id}-player`) ||
			(await this.create(server, tournament.id));
		this.roleCache[tournament.id] = { id: role.id, server };
		return role.id;
	}

	// Preconditions: user in tournament.server or this throws

	public async grant(userId: string, tournament: Tournament): Promise<void> {
		const role = await this.get(tournament);
		await this.roleCache[tournament.id].server.addMemberRole(userId, role, "Granted by Emcee.");
	}

	public async ungrant(userId: string, tournament: Tournament): Promise<void> {
		const role = await this.get(tournament);
		await this.roleCache[tournament.id].server.removeMemberRole(userId, role, "Removed by Emcee.");
	}

	public async delete(tournament: Tournament): Promise<void> {
		if (tournament.id in this.roleCache) {
			const { id, server } = this.roleCache[tournament.id];
			server.deleteRole(id);
		} else {
			const server = this.bot.guilds.get(tournament.server);
			if (!server) {
				// This actually only checks if the server is in the cache
				throw new MiscInternalError(
					`Could not find server ${tournament.server} as registered with Tournament ${tournament.server}.`
				);
			}
			const role = server.roles.find(r => r.name === `MC-${tournament.id}-player`);
			if (role) {
				server.deleteRole(role.id);
			}
		}
	}
}
