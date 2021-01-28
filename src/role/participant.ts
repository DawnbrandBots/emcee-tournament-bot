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

// TODO: logging, including additional parameters to role grants for audit log
// TODO: error handling for Discord API failures
// TODO: figure out how to store server objects, if we even should
// TODO: evaluate https://abal.moe/Eris/docs/Guild#function-removeMemberRole vs getRESTMember
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

	public async grant(userId: string, tournament: Tournament): Promise<void> {
		const role = await this.get(tournament);
		const server = this.roleCache[tournament.id].server;
		const member = server.members.get(userId) || (await server.getRESTMember(userId));
		member.addRole(role);
	}

	public async ungrant(userId: string, tournament: Tournament): Promise<void> {
		const role = await this.get(tournament);
		const server = this.roleCache[tournament.id].server;
		const member = server.members.get(userId) || (await server.getRESTMember(userId));
		member.removeRole(role);
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
