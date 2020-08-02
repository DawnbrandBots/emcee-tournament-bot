import Controller, { DiscordWrapper } from "./controller";

export default class RoundController extends Controller {
	async next(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId
		return;
	}

	async score(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, winner, score string to two numbers
		return;
	}
}
