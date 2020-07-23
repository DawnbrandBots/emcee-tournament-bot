import { findTournament, isOrganising } from "../actions";
import { Tournament } from "../tournament";
import { TournamentDoc } from "../models";
import { Message } from "eris";
import { UnauthorisedHostError, UserError } from "../errors";

export async function getTournamentInterface(id: string, host: string): Promise<[Tournament, TournamentDoc]> {
	const doc = await findTournament(id);
	if (!(await isOrganising(host, id))) {
		throw new UnauthorisedHostError(host, id);
	}
	return [new Tournament(doc), doc];
}

export function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new UserError("You must @mention a valid user!");
	}
	return user.id;
}
