import { Message } from "eris";
import { getTournamentInterface } from "./utils";

export async function nextRound(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const round = await tournament.nextRound(msg.author.id);
	if (round === -1) {
		await msg.channel.createMessage(`${doc.name} has successfully been concluded.`);
	} else {
		await msg.channel.createMessage(`${doc.name} has successfully progressed to Round ${round}.`);
	}
}
