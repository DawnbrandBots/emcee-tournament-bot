import { Message } from "eris";
import { getTournamentInterface } from "./utils";

export async function cancelTournament(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	await tournament.finishTournament(msg.author.id, true);
	await msg.channel.createMessage(`${doc.name} has successfully been cancelled.`);
}

export async function help(msg: Message): Promise<void> {
	await msg.channel.createMessage(
		"Emcee's documentation can be found at https://github.com/AlphaKretin/deck-parse-bot/wiki."
	);
}
