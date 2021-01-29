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

	protected async lazyGet(tournament: Tournament): Promise<ParticipantRole> {
		if (tournament.id in this.roleCache) {
			return this.roleCache[tournament.id];
		}
		const server = this.bot.guilds.get(tournament.server);
		if (!server) {
			// This actually only checks if the server is in the cache
			throw new MiscInternalError(
				`Could not find server ${tournament.server} as registered with Tournament ${tournament.server}.`
			);
		}
		logger.verbose(
			JSON.stringify({
				method: "get",
				tournament: tournament.id,
				server: tournament.server,
				event: "cache miss"
			})
		);
		const role =
			server.roles.find(r => r.name === `MC-${tournament.id}-player`) ||
			(await this.create(server, tournament.id));
		return (this.roleCache[tournament.id] = { id: role.id, server });
	}

	public async get(tournament: Tournament): Promise<string> {
		return (await this.lazyGet(tournament)).id;
	}

	// Preconditions: user is in tournament.server or this throws

	public async grant(userId: string, tournament: Tournament): Promise<void> {
		const { id, server } = await this.lazyGet(tournament);
		await server.addMemberRole(userId, id, "Granted by Emcee.");
	}

	public async ungrant(userId: string, tournament: Tournament): Promise<void> {
		const { id, server } = await this.lazyGet(tournament);
		await server.removeMemberRole(userId, id, "Granted by Emcee.");
	}

	public async delete(tournament: Tournament): Promise<void> {
		logger.verbose(
			JSON.stringify({
				method: "delete",
				tournament: tournament.id,
				server: tournament.server,
				event: "attempt"
			})
		);
		if (tournament.id in this.roleCache) {
			const { id, server } = this.roleCache[tournament.id];
			await server.deleteRole(id); // potential exception
			delete this.roleCache[tournament.id];
			logger.info(
				JSON.stringify({
					method: "delete",
					tournament: tournament.id,
					server: tournament.server,
					serverName: server.name,
					event: "success"
				})
			);
			return;
		} else {
			const server = this.bot.guilds.get(tournament.server);
			if (!server) {
				logger.error(new Error(`Could not find server ${tournament.server}.`));
				return;
			}
			const role = server.roles.find(r => r.name === `MC-${tournament.id}-player`);
			if (role) {
				await server.deleteRole(role.id); // potential exception
				logger.info(
					JSON.stringify({
						method: "delete",
						tournament: tournament.id,
						server: tournament.server,
						serverName: server.name,
						event: "success, cache miss"
					})
				);
			} else {
				logger.warn(
					JSON.stringify({
						method: "delete",
						tournament: tournament.id,
						server: tournament.server,
						serverName: server.name,
						event: "not found"
					})
				);
			}
		}
	}
}
