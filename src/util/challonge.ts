import { WebsiteMatch, WebsiteWrapperChallonge } from "../website/challonge";

export async function findMatch(
	tournamentId: string,
	playerId: number,
	challonge: WebsiteWrapperChallonge
): Promise<WebsiteMatch | undefined> {
	// an open match will be in the current round
	const matches = await challonge.getMatches(tournamentId, true, playerId);
	if (matches.length > 0) {
		return matches[0];
	}
}
