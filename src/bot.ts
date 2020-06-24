import { Client, Message, GuildChannel } from "eris";
import { discordToken } from "./config/env";
import { MiscInternalError, AssertTextChannelError } from "./errors";

export const bot = new Client(discordToken);

const toRoles: { [guild: string]: string } = {}; // TODO: Persist

export function getTORole(guildId: string): string {
	if (!(guildId in toRoles)) {
		throw new MiscInternalError(`No role for guild ${guildId}!`);
	}
	return toRoles[guildId];
}

export function getTORoleFromMessage(msg: Message): string {
	const channel = msg.channel;
	if (!(channel instanceof GuildChannel)) {
		throw new AssertTextChannelError(channel.id);
	}
	const guild = channel.guild;
	return getTORole(guild.id);
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
