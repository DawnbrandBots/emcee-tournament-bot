export class UserError extends Error {}

export class ChallongeAPIError extends Error {}

export class TournamentNotFoundError extends UserError {
	challongeId: string;

	constructor(challongeId: string) {
		super(`Unknown tournament ${challongeId}.`);
		this.challongeId = challongeId;
	}
}

export class UnauthorisedHostError extends UserError {
	host: string;
	challongeId: string;

	constructor(host: string, challongeId: string) {
		super(`User ${host} not authorised for tournament ${challongeId}.`);
		this.host = host;
		this.challongeId = challongeId;
	}
}

export class UnauthorisedPlayerError extends UserError {
	player: string;
	challongeId: string;

	constructor(player: string, challongeId: string) {
		super(`User ${player} not a player in tournament ${challongeId}.`);
		this.player = player;
		this.challongeId = challongeId;
	}
}

export class UnauthorisedTOError extends UserError {
	to: string;
	constructor(to: string) {
		super(`User ${to} not authorised to create tournaments in this server.`);
		this.to = to;
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

export class BlockedDMsError extends UserError {
	constructor(userId: string) {
		super(`User <@${userId}> does not accept DMs from me! Please ask them to change their settings to allow this.`);
	}
}

export class MiscInternalError extends Error {}
