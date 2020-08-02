import Controller, { DiscordWrapper, SendMessageFunction } from "./controller";
import { Message } from "eris";

export default class ParticipantController extends Controller {
	async list(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId
		return;
	}

	// Can also be invoked by "messageReactionAdd"
	async addPending(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, user Discord ID
		return;
	}

	// TBD
	async confirmPending(
		sendMessage: SendMessageFunction,
		message: Message // TODO: remove direct Eris dependency after DiscordDeck refactor
	): Promise<void> {
		return;
	}

	async getDeck(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, user Discord ID
		return;
	}

	// Can be invoked by a force drop command and "messageReactionRemove"
	async drop(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, user Discord ID
		return;
	}
}
