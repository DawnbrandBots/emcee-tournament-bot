import { Guild, GuildChannel, Message } from "eris";
import { UnauthorisedTOError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("role:organiser");

export class OrganiserRoleProvider {
	protected roleCache: { [serverId: string]: string } = {};

	// Using American spelling for Eris consistency
	constructor(readonly name: string, readonly color?: number) {}

	public async create(server: Guild): Promise<string> {
		// TODO: error handling?
		const role = await server.createRole(
			{
				name: this.name,
				color: this.color
			},
			"Auto-created by Emcee."
		);
		this.roleCache[server.id] = role.id;
		logger.verbose(`Role ${this.name} (${role.id}) created in ${server.name} (${server.id}).`);
		return role.id;
	}

	public async get(server: Guild): Promise<string> {
		if (server.id in this.roleCache) {
			return this.roleCache[server.id];
		}
		// Find already-created role and cache in memory
		const existingRole = server.roles.find(role => role.name === this.name);
		if (existingRole) {
			return (this.roleCache[server.id] = existingRole.id);
		}
		// TODO: log?
		return await this.create(server);
	}

	public async authorize(msg: Message): Promise<void> {
		if (!(msg.channel instanceof GuildChannel)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		const server = msg.channel.guild;
		// Since we have the provided context of a message sent to the bot, we can simply
		// use the Eris cache to get server member metadata for the message author
		const member = server.members.get(msg.author.id);
		if (!member) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		const role = await this.get(server);
		if (!member.roles.includes(role)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				server: server.id,
				event: `authorised in '${server.name}'`
			})
		);
	}
}
