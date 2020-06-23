import { Message } from "eris";
import { MiscUserError, Tournament } from "../tournament";
import { getTournamentInterface } from "./utils";

export async function createTournament(msg: Message, args: string[]): Promise<void> {
	const [name, desc] = args;
	if (name.length === 0 || desc.length === 0) {
		throw new MiscUserError("You must provide a valid tournament name and description!");
	}
	const tournament = await Tournament.init(name, desc, msg);
	const [, doc] = await getTournamentInterface(tournament.id, msg.author.id);
	await msg.channel.createMessage(
		`Tournament ${name} created! You can find it at https://challonge.com/${doc.challongeId}. For future commands, refer to this tournament by the id \`${doc.challongeId}\``
	);
}

export async function updateTournament(msg: Message, args: string[]): Promise<void> {
	const [id, name, desc] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const oldName = doc.name;
	const oldDesc = doc.description;
	if (name.length === 0 || desc.length === 0) {
		throw new MiscUserError("You must provide a valid tournament name and description!");
	}
	const [newName, newDesc] = await tournament.updateTournament(name, desc, msg.author.id);
	await msg.channel.createMessage(
		`Tournament ${oldName} successfully renamed to ${newName}!\nPrevious description:\n${oldDesc}\nNew description:\n${newDesc}`
	);
}
