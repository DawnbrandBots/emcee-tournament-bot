import { Message } from "eris";
import { getTournamentInterface } from "./utils";

export async function open(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.openRegistration(msg.author.id);
	await msg.channel.createMessage(`${doc.name} has successfully been opened for registration.`);
}

export async function start(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.start(msg.author.id);
	await msg.channel.createMessage(`${doc.name} has successfully been commenced.`);
}

export async function cancelTournament(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.finishTournament(msg.author.id, true);
	await msg.channel.createMessage(`${doc.name} has successfully been cancelled.`);
}
