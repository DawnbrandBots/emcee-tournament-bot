import { Message } from "eris";
import { Tournament } from "../tournament";

export async function parseCommand(msg: Message): Promise<void> {
	throw new Error("Not yet implemented!");
}

async function createTournament(msg: Message, args: string[]): Promise<void> {
	const [name, desc] = args;
	await Tournament.init(name, desc, msg);
	await msg.channel.createMessage(`Tournament ${name} created!`);
}
