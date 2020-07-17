import { Message } from "eris";
import { getPlayerFromId } from "../actions";
import { getTournamentInterface, getMentionedUserId } from "./utils";
import { UserError } from "../errors";
import { mention } from "../tournament";
async function getPlayerDiscord(tournamentId: string, playerId: number): Promise<string | undefined> {
	const player = await getPlayerFromId(tournamentId, playerId);
	return player?.discord;
}

export async function submitScore(msg: Message, args: string[]): Promise<void> {
	const [id, score] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const winner = getMentionedUserId(msg);
	const scoreRegex = /(\d)-(\d)/;
	const scoreMatch = scoreRegex.exec(score);
	const winnerScore = parseInt(scoreMatch ? scoreMatch[1] : "");
	const loserScore = parseInt(scoreMatch ? scoreMatch[2] : "");
	if (!scoreMatch || isNaN(winnerScore) || isNaN(loserScore)) {
		throw new UserError("You must report the score in the format `#-#`, with the winner first, e.g. `2-1`!");
	}
	const result = await tournament.submitScore(winner, winnerScore, loserScore, msg.author.id);
	const loser =
		result.match.winner_id === result.match.player1_id
			? await getPlayerDiscord(id, result.match.player2_id)
			: await getPlayerDiscord(id, result.match.player1_id);
	const loserString = loser ? ` over ${mention(loser)}` : "";
	await msg.channel.createMessage(
		`Score successfully submitted for ${doc.name}. <@${winner}> won ${scoreMatch[0]}${loserString}.`
	);
}
