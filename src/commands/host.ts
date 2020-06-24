import { Message } from "eris";
import { getTournamentInterface, getMentionedUserId } from "./utils";

export async function addHost(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const host = getMentionedUserId(msg);
	if (await tournament.addHost(msg.author.id, host)) {
		await msg.channel.createMessage(`<@${host}> successfully added as a host for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${host}> is already a host for ${doc.name}.`);
	}
}

export async function removeHost(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const host = getMentionedUserId(msg);
	if (await tournament.addHost(msg.author.id, host)) {
		await msg.channel.createMessage(`<@${host}> successfully added as a host for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${host}> is already a host for ${doc.name}.`);
	}
}
