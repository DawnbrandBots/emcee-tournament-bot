import { WebsiteMatch, WebsiteWrapperChallonge } from "../website/challonge";
import { UserError } from "./errors";

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

// this can also find open matches, but uses a weighter query to include closed matches
export async function findClosedMatch(
	tournamentId: string,
	playerId: number,
	challonge: WebsiteWrapperChallonge
): Promise<WebsiteMatch | undefined> {
	// don't filter for open so we can submit to closed
	// don't filter for player so we can get correct round no.
	const matches = await challonge.getMatches(tournamentId, false);
	// get round number from first open round
	const round = matches.filter(m => m.open)[0].round;
	const match = matches.find(m => m.round === round && (m.player1 === playerId || m.player2 === playerId));
	if (!match) {
		// may have the bye
		throw new UserError(
			`Could not find a match with Player ${playerId} in Tournament ${tournamentId}, Round ${round}!`
		);
	}
	return match;
}
