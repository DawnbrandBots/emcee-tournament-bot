import { Challonge } from "../challonge";

// Abstract superclass for a structured grouping of actions (business logic)
export default abstract class Controller {
	protected challonge: Challonge;

	constructor(challonge: Challonge) {
		this.challonge = challonge;
	}
}

// Subset of Eris.User that we may care about
export interface DiscordUserSubset {
	id: string;
	mention: string;
	username: string;
	discriminator: string;
}

// Passed to controller actions like a Request object in Web MVC frameworks
// If Eris.Message proves to be very mockable and easy to test,
// this indirection may be unnecessary
export interface DiscordSender {
	sendMessage(message: string): Promise<void>; // may throw
	sendDirectMessage(userId: string, message: string): Promise<void>; // may throw
	sendChannelMessage(channelId: string, message: string): Promise<void>; // may not throw
	currentMessageId(): string;
	currentChannelId(): string;
}

export interface DiscordWrapper extends DiscordSender {
	isTextChannel(id: string): boolean;
	currentServerId(): string;
	currentUser(): DiscordUserSubset;
	// Throw if missing role. This could be return-based and more fine-grained.
	assertUserPrivileged(): Promise<void>;
	mentions: () => DiscordUserSubset[];
}

// All actions meant to be called by the command dispatcher have this interface
// and may throw exceptions (i.e. promise rejection)
export interface ControllerAction {
	(discord: DiscordWrapper, args: string[]): Promise<void>
}
