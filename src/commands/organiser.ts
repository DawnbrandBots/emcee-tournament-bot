import { Message } from "eris";
import { getTournamentInterface, getMentionedUserId } from "./utils";

export async function addOrganiser(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const organiser = getMentionedUserId(msg);
	if (await tournament.addOrganiser(msg.author.id, organiser)) {
		await msg.channel.createMessage(`<@${organiser}> successfully added as an organiser for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${organiser}> is already an organiser for ${doc.name}.`);
	}
}

export async function removeOrganiser(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const organiser = getMentionedUserId(msg);
	if (await tournament.addOrganiser(msg.author.id, organiser)) {
		await msg.channel.createMessage(`<@${organiser}> successfully added as an organiser for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${organiser}> is already an organiser for ${doc.name}.`);
	}
}
