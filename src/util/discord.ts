import { Message, Textable } from "eris";
import { UserError } from "./errors";

export async function reply(
	msg: Message,
	...args: Parameters<Textable["createMessage"]>
): ReturnType<Textable["createMessage"]> {
	return await msg.channel.createMessage(...args);
}

export function firstMentionOrFail(msg: Message): string {
	if (msg.mentions.length < 1) {
		throw new UserError(`Message does not mention a user!\n\`${msg.content}\``);
	}
	return msg.mentions[0].id;
}
