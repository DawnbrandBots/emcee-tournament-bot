import { Client, Message, GuildChannel, Guild, Role } from "eris";
import { discordToken } from "./config/env";
import { MiscInternalError, AssertTextChannelError } from "./errors";
import logger from "./logger";

export const bot = new Client(discordToken);

const toRoles: { [guild: string]: string } = {};

async function createTORole(guild: Guild, name: string): Promise<Role> {
	const newRole = await guild.createRole(
		{
			name: name,
			color: 0x3498db
		},
		"Auto-created by Emcee bot."
	);
	toRoles[guild.id] = newRole.id;
	logger.log({
		level: "verbose",
		message: `TO role ${newRole.id} re-created in ${guild.id}.`
	});
	return newRole;
}

export async function getTORole(guildId: string): Promise<string> {
	const guild = bot.guilds.get(guildId);
	if (!guild) {
		throw new MiscInternalError(`Invalid guild ${guildId}!`);
	}
	if (guild.id in toRoles) {
		return toRoles[guild.id];
	}
	const name = "MC-TO";
	const role = guild.roles.find(r => r.name === name);
	if (role) {
		toRoles[guild.id] = role.id;
		return role.id;
	}
	const newRole = await createTORole(guild, name);
	return newRole.id;
}

export async function getTORoleFromMessage(msg: Message): Promise<string> {
	const channel = msg.channel;
	if (!(channel instanceof GuildChannel)) {
		throw new AssertTextChannelError(channel.id);
	}
	const guild = channel.guild;
	return await getTORole(guild.id);
}

bot.on("guildCreate", guild => {
	createTORole(guild, "MC-TO").catch(e => {
		logger.log({
			level: "error",
			message: e.message
		});
	});
});
