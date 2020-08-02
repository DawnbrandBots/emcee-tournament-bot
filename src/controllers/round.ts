import Controller, { SendMessageFunction } from "./controller";

export default class RoundController extends Controller {
	async next(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async score(
		sendMessage: SendMessageFunction,
		challongeId: string,
		winner: string,
		winnerScore: number,
		loserScore: number
	): Promise<void> {
		return;
	}
}
