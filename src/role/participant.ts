import { Client, Guild, Role } from "discord.js";
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

/**
 * Creates the server role that identifies confirmed status in a given tournament.
 */
export class ParticipantRoleProvider {
	// Storing a reference to the DJS cached server might not be necessary if parameterised
	protected roleCache: Record<string, ParticipantRole> = {};

	// Using American spelling for DJS consistency
	constructor(protected readonly bot: Client, readonly color?: number) {}

	/**
	 * Creates the role in question on the specified server for the specified tournament.
	 * Exceptions (missing permissions, network fault) can be thrown.
	 *
	 * @param server The server to create the role in
	 * @param tournamentId Unique label
	 * @returns The created role
	 */
	private async create(server: Guild, tournamentId: string): Promise<Role> {
		const role = await server.roles.create({
			name: `MC-${tournamentId}-player`,
			color: this.color,
			reason: "Auto-created by Emcee."
		});
		logger.verbose(`Role ${role.name} (${role.id}) created in ${server.name} (${server.id}).`);
		return role;
	}

	/**
	 * Retrieve the participant role and cache it, or create it if it does not exist.
	 * Exceptions on creation (missing permissions, network fault) can be thrown.
	 *
	 * @param tournament Unique tournament label and Discord guild snowflake
	 * @returns Role snowflake and guild snowflake as cached
	 */
	protected async lazyGet(tournament: Tournament): Promise<ParticipantRole> {
		if (tournament.id in this.roleCache) {
			return this.roleCache[tournament.id];
		}
		const server = await this.bot.guilds.fetch(tournament.server);
		logger.verbose(
			JSON.stringify({
				method: "get",
				tournament: tournament.id,
				server: tournament.server,
				event: "cache miss"
			})
		);
		const role =
			server.roles.cache.find(r => r.name === `MC-${tournament.id}-player`) ||
			(await this.create(server, tournament.id));
		return (this.roleCache[tournament.id] = { id: role.id, server });
	}

	/**
	 * Retrieve the participant role and cache it, or create it if it does not exist.
	 * Exceptions on creation (missing permissions, network fault) can be thrown.
	 *
	 * @param tournament Unique tournament label and Discord guild snowflake
	 * @returns Role snowflake
	 */
	public async get(tournament: Tournament): Promise<string> {
		return (await this.lazyGet(tournament)).id;
	}

	/**
	 * Assuming the specified user is in tournament.server, assign the corresponding
	 * tournament participant role (idempotent), creating it if it does not exist.
	 * Exceptions on creation (missing permissions, network fault) can be thrown.
	 * Exceptions on adding role (missing permissions, user not in server) can be thrown.
	 *
	 * @param userId User snowflake
	 * @param tournament Unique tournament label and Discord guild snowflake
	 */
	public async grant(userId: string, tournament: Tournament): Promise<void> {
		const { id, server } = await this.lazyGet(tournament);
		// TODO: handle null user
		const member = await server.members.fetch(userId);
		await member.roles.add(id, "Granted by Emcee.");
	}

	/**
	 * Assuming the specified user is in tournament.server, remove the corresponding
	 * tournament participant role (idempotent), creating it if it does not exist.
	 * Exceptions on creation (missing permissions, network fault) can be thrown.
	 * Exceptions on removing role (missing permissions, user not in server) can be thrown.
	 *
	 * @param userId User snowflake
	 * @param tournament Unique tournament label and Discord guild snowflake
	 */
	public async ungrant(userId: string, tournament: Tournament): Promise<void> {
		const { id, server } = await this.lazyGet(tournament);
		// TODO: handle null user
		await server.members.cache.get(userId)?.roles.remove(id, "Granted by Emcee.");
	}

	/**
	 * Delete the corresponding role for the specified tournament.
	 * Exceptions are absorbed.
	 *
	 * @param tournament Unique tournament label and Discord guild snowflake
	 */
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
			try {
				const role = await server.roles.fetch(id);
				// TODO: handle null role
				await role!.delete();
			} catch (e) {
				logger.error(e);
			}
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
			const server = this.bot.guilds.cache.get(tournament.server);
			if (!server) {
				logger.error(new Error(`Could not find server ${tournament.server}.`));
				return;
			}
			const role = server.roles.cache.find(r => r.name === `MC-${tournament.id}-player`);
			if (role) {
				try {
					await role.delete();
				} catch (e) {
					logger.error(e);
				}
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
