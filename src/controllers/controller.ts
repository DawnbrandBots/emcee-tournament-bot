import { Challonge } from "../challonge";

export default abstract class Controller {
	protected challonge: Challonge;

	constructor(challonge: Challonge) {
		this.challonge = challonge;
	}
}

export interface SendMessageFunction {
	(message: string): Promise<void>
}

// Subset of Eris.User that we may care about
export interface DiscordUserSubset {
	id: string;
	mention: string;
	discriminator: string;
}

// Passed to controller actions like a Request object
// If Eris.Message proves to be very mockable and easy to test,
// this indirection may be unnecessary
export interface DiscordWrapper {
	sendMessage(message: string): Promise<void>;
	currentChannelId(): string;
	isTextChannel(id: string): boolean;
	currentServerId(): string;
	currentUser(): DiscordUserSubset;
	// Throw if missing role. This could be return-based and more fine-grained.
	assertUserPrivileged(): Promise<void>;
	mentions: () => DiscordUserSubset[];
}
