export class UserError extends Error {}

export class ChallongeAPIError extends Error {}

export class TournamentNotFoundError extends UserError {
	challongeId: string;

	constructor(challongeId: string) {
		super(`Unknown tournament ${challongeId}`);
		this.challongeId = challongeId;
	}
}

export class UnauthorisedHostError extends UserError {
	host: string;
	challongeId: string;

	constructor(host: string, challongeId: string) {
		super(`Host ${host} not authorised for tournament ${challongeId}`);
		this.host = host;
		this.challongeId = challongeId;
	}
}

export class DeckNotFoundError extends UserError {
	message = "Must provide either attached `.ydk` file or valid `ydke://` URL!";
}

export class AssertTextChannelError extends UserError {
	channelId: string;

	constructor(channelId: string) {
		super(`Channel ${channelId} is not a valid text channel`);
		this.channelId = channelId;
	}
}

export class MiscInternalError extends Error {}
