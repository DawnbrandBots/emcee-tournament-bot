import { Guild } from "eris"
import logger from "../logger";

export default class RoleProvider {
	readonly name: string;
	readonly color?: number;  // Using American spelling for Eris consistency
	protected roleCache: { [serverId: string]: string } = {};

	constructor(name: string, color?: number) {
		this.name = name;
		this.color = color;
	}

	async create(server: Guild): Promise<string> {
		// TODO: error handling?
		const role = await server.createRole({
			name: this.name,
			color: this.color
		}, "Auto-created by Emcee.");
		this.roleCache[server.id] = role.id;
		logger.verbose(`TO role ${role.id} created in ${server.name} (${server.id}).`);
		return role.id;
	}

	protected async get(server: Guild): Promise<string> {
		if (server.id in this.roleCache) {
			return this.roleCache[server.id];
		}
		// Find already-created role and cache in memory
		const existingRole = server.roles.find(role => role.name === this.name);
		if (existingRole) {
			return this.roleCache[server.id] = existingRole.id;
		}
		return await this.create(server);
	}

	async validate(server: Guild, roles: string[]): Promise<boolean> {
		return roles.includes(await this.get(server));
	}
}