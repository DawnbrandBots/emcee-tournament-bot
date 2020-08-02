import Controller, { SendMessageFunction } from "./controller";
import { Message } from "eris";

export default class ParticipantController extends Controller {
	async list(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async addPending(
		sendMessage: SendMessageFunction,
		challongeId: string,
		discordId: string
	): Promise<void> {
		return;
	}

	async confirmPending(
		sendMessage: SendMessageFunction,
		message: Message // TODO: remove direct Eris dependency after DiscordDeck refactor
	): Promise<void> {
		return;
	}

	async getDeck(
		sendMessage: SendMessageFunction,
		challongeId: string,
		discordId: string
	): Promise<void> {
		return;
	}

	async drop(
		sendMessage: SendMessageFunction,
		challongeId: string,
		discordId: string
	): Promise<void> {
		return;
	}
}
