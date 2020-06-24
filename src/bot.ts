import { Client, Message, GuildChannel } from "eris";
import { discordToken } from "./config/env";
import { MiscInternalError, AssertTextChannelError } from "./errors";

export const bot = new Client(discordToken);

const toRoles: { [guild: string]: string } = {};

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
	const newRole = await guild.createRole(
		{
			name: name,
			color: 0xe67e22
		},
		"Auto-created by Emcee bot."
	);
	toRoles[guild.id] = newRole.id;
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
	guild
		.createRole({
			name: "MC-TO",
			color: 0x3498db
		})
		.then(role => {
			toRoles[guild.id] = role.id;
			// TODO: Log role creation once merged
		})
		.catch(e => {
			console.error(e); // TODO: Log with winston once merged
		});
});
