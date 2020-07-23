import { getAuthorizedTournament } from "../actions";
import { Tournament } from "../tournament";
import { Message } from "eris";
import { UserError } from "../errors";

export async function getTournamentInterface(id: string, host: string): Promise<Tournament> {
	return new Tournament(await getAuthorizedTournament(id, host));
}

export function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new UserError("You must @mention a valid user!");
	}
	return user.id;
}
