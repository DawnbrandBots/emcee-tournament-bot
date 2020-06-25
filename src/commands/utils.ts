import { findTournament, isOrganising } from "../actions";
import { getTournament, Tournament } from "../tournament";
import { TournamentDoc } from "../models";
import { Message } from "eris";
import { TournamentNotFoundError, UnauthorisedHostError, UserError } from "../errors";

export async function getTournamentInterface(id: string, host: string): Promise<[Tournament, TournamentDoc]> {
	const doc = await findTournament(id);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	if (!(await isOrganising(host, id))) {
		throw new UnauthorisedHostError(host, id);
	}
	return [tournament, doc];
}

export function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new UserError("You must @mention a valid user!");
	}
	return user.id;
}
