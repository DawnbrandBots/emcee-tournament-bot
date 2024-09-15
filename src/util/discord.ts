import { Client, Message, TextChannel, User } from "discord.js";
import { UserError } from "./errors";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function send(bot: Client, channelId: string, ...args: Parameters<TextChannel["send"]>) {
	const channel = await bot.channels.fetch(channelId);
	if (channel?.isSendable()) {
		return await channel.send(...args);
	}
	throw new Error(`${channelId} is not a text channel`);
}

export async function dm(bot: Client, userId: string, ...args: Parameters<TextChannel["send"]>): Promise<void> {
	const user = await bot.users.fetch(userId);
	await user.send(...args);
}

/**
 * Retrieves user information by the REST API if not cached.
 */
export async function username(bot: Client, userId: string): Promise<string | null> {
	try {
		const user = await bot.users.fetch(userId);
		return user.tag;
	} catch {
		return null;
	}
}

export async function removeReaction(
	bot: Client,
	channelId: string,
	messageId: string,
	emoji: string,
	userId: string
): Promise<void> {
	const channel = await bot.channels.fetch(channelId);
	if (channel?.isTextBased()) {
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
