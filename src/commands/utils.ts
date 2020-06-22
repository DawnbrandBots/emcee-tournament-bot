import { findTournament, TournamentNotFoundError } from "../actions";
import { getTournament, Tournament, MiscUserError } from "../tournament";
import { TournamentDoc } from "../models";
import { Message } from "eris";

export async function getTournamentInterface(id: string): Promise<[Tournament, TournamentDoc]> {
	const doc = await findTournament(id);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	return [tournament, doc];
}

export function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new MiscUserError("You must @mention the winner of the match you are reporting for!");
	}
	return user.id;
}
