import { findTournament, isOrganising } from "../actions";
import { getTournament, Tournament } from "../tournament";
import { TournamentDoc } from "../models";
import { Message } from "eris";
import { TournamentNotFoundError, UnauthorisedOrganiserError, UserError } from "./errors";

export async function getTournamentInterface(id: string, organiser: string): Promise<[Tournament, TournamentDoc]> {
	const doc = await findTournament(id);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	if (!(await isOrganising(organiser, id))) {
		throw new UnauthorisedOrganiserError(organiser, id);
	}
	return [tournament, doc];
}

export function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new UserError("You must @mention the winner of the match you are reporting for!");
	}
	return user.id;
}
