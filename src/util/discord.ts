import { Client, Message, TextChannel, User } from "discord.js";
import { UserError } from "./errors";

export async function send(
	bot: Client,
	channelId: string,
	...args: Parameters<TextChannel["send"]>
): ReturnType<TextChannel["send"]> {
	const channel = await bot.channels.fetch(channelId);
	if (channel?.isText()) {
		return await channel.send(...args);
	}
	throw new Error(`${channelId} is not a text channel`);
}

export async function removeReaction(
	bot: Client,
	channelId: string,
	messageId: string,
	emoji: string,
	userId: string
): Promise<void> {
	const channel = await bot.channels.fetch(channelId);
	if (channel?.isText()) {
		const msg = await channel.messages.fetch(messageId);
		await msg.reactions.cache.get(emoji)?.users.remove(userId);
	} else {
		throw new Error(`${channelId} is not a text channel`);
	}
}

// returns full user object with d.js due to additional complexity of msg.mentions
export function firstMentionOrFail(msg: Message): User {
	const user = msg.mentions.users.first();
	if (!user) {
		throw new UserError(`Message does not mention a user!\n\`${msg.content}\``);
	}
	return user;
}

export function parseUserMention(who: string): string | null {
	if (who.startsWith("<@") && who.endsWith(">")) {
		if (who.charAt(2) === "!") {
			return who.slice(3, -1);
		} else {
			return who.slice(2, -1);
		}
	} else {
		return null;
	}
}
