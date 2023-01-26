// Adapted from https://github.com/DawnbrandBots/bastion-bot/blob/master/src/utils.ts
import { AutocompleteInteraction, CommandInteraction, Guild } from "discord.js";

export function serializeServer(server: Guild): string {
	const createdAt = new Date(server.createdAt).toISOString();
	return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerId}>`;
}

export function serialiseInteraction(
	interaction: CommandInteraction | AutocompleteInteraction,
	extras?: Record<string, unknown>
): string {
	return JSON.stringify({
		channel: interaction.channelId,
		message: interaction.id,
		guild: interaction.guildId,
		author: interaction.user.id,
		id: interaction.commandId,
		command: interaction.commandName,
		...extras
	});
}
