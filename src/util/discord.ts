import { Message, User } from "discord.js";
import { UserError } from "./errors";

// Discord.js v13 apparently will automatically use inline replies
export async function reply(msg: Message, ...args: Parameters<Message["reply"]>): ReturnType<Message["reply"]> {
	// TODO: mixin allowedMentions
	return await msg.reply(...args);
}

// TODO: refactor for Discord.js in detail
/*export async function reply(
	msg: Message,
	...args: Parameters<Textable["createMessage"]>
): ReturnType<Textable["createMessage"]> {
	const mixin = {
		messageReference: {
			messageID: msg.id
		},
		allowedMentions: {
			repliedUser: true
		}
	};
	if (typeof args[0] === "string") {
		args[0] = {
			content: args[0],
			...mixin
		};
	} else {
		args[0] = { ...args[0], ...mixin };
	}
	return await msg.channel.createMessage(...args);
}*/

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
