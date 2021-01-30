import { Message, Textable } from "eris";

export async function reply(
	msg: Message,
	...args: Parameters<Textable["createMessage"]>
): ReturnType<Textable["createMessage"]> {
	return await msg.channel.createMessage(...args);
}
