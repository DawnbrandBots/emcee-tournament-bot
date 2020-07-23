import { Message } from "eris";
import { getTournamentInterface, getMentionedUserId } from "./utils";

export async function addHost(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const tournament = await getTournamentInterface(id, msg.author.id);
	const host = getMentionedUserId(msg);
	if (await tournament.addHost(msg.author.id, host)) {
		await msg.channel.createMessage(`<@${host}> successfully added as a host for ${tournament.doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${host}> is already a host for ${tournament.doc.name}.`);
	}
}

export async function removeHost(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const tournament = await getTournamentInterface(id, msg.author.id);
	const host = getMentionedUserId(msg);
	if (await tournament.removeHost(msg.author.id, host)) {
		await msg.channel.createMessage(`<@${host}> successfully removed as a host for ${tournament.doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${host}> is not a host for ${tournament.doc.name}.`);
	}
}
