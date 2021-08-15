import { Guild, Message } from "discord.js";
import { UnauthorisedTOError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("role:organiser");

/**
 * Creates the server role that permits using the list and create commands.
 */
export class OrganiserRoleProvider {
	protected roleCache: { [serverId: string]: string } = {};

	// Using American spelling for DJS consistency
	constructor(readonly name: string, readonly color?: number) {}

	/**
	 * Creates the role in question and stores it in the internal cache.
	 * Exceptions (missing permissions, network fault) can be thrown.
	 *
	 * @param server The server to create the organiser role in
	 * @returns Discord role snowflake
	 */
	public async create(server: Guild): Promise<string> {
		const role = await server.roles.create({
			name: this.name,
			color: this.color,
			reason: "Auto-created by Emcee."
		});
		this.roleCache[server.id] = role.id;
		logger.info(`Role ${this.name} (${role.id}) created in ${server.name} (${server.id}).`);
		return role.id;
	}

	/**
	 * Retrieve the organiser role and cache it, or create the role if it is missing.
	 * Exceptions on creation (missing permissions, network fault) can be thrown.
	 *
	 * @param server The server to retrieve or create the organiser role in
	 * @returns Discord role snowflake
	 */
	public async get(server: Guild): Promise<string> {
		if (server.id in this.roleCache) {
			return this.roleCache[server.id];
		}
		// Find already-created role and cache in memory
		const existingRole = server.roles.cache.find(role => role.name === this.name);
		if (existingRole) {
			logger.verbose(`Cached role ${this.name} (${existingRole.id}) in ${server.name} (${server.id}).`);
			return (this.roleCache[server.id] = existingRole.id);
		}
		logger.verbose(`Cache miss for role ${this.name} in ${server.name} (${server.id}).`);
		return await this.create(server);
	}

	/**
	 * Assert that the sender of the message holds the organiser role for the server
	 * the message was sent in, or throw UnauthorisedTOError.
	 * Exceptions on role creation (missing permissions, network fault) can be thrown.
	 *
	 * @param msg The message to authorise
	 * @throws UnauthorisedTOError
	 */
	public async authorise(msg: Message): Promise<void> {
		if (!("guildId" in msg.channel)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		const server = msg.channel.guild;
		// Since we have the provided context of a message sent to the bot, this should
		// only hit the cache to get server member metadata for the message author
		const member = await server.members.fetch(msg.author.id);
		const role = await this.get(server);
		if (!member.roles.cache.has(role)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				server: server.id,
				event: `authorised in '${server.name}'`
			})
		);
	}
}
