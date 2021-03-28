import { Message, MessageContent, Textable } from "eris";
import { UserError } from "./errors";

export async function reply(
	msg: Message,
	...args: Parameters<Textable["createMessage"]>
): ReturnType<Textable["createMessage"]> {
	const [content, file] = args;
	if (typeof content === "string") {
		return await msg.channel.createMessage(
			{
				content,
				message_reference: {
					message_id: msg.id
				}
			} as MessageContent,
			file
		);
	}
	return await msg.channel.createMessage(
		{
			...content,
			message_reference: {
				message_id: msg.id
			}
		} as MessageContent,
		file
	);
}

export function firstMentionOrFail(msg: Message): string {
	if (msg.mentions.length < 1) {
		throw new UserError(`Message does not mention a user!\n\`${msg.content}\``);
	}
	return msg.mentions[0].id;
}
