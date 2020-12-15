export class UserError extends Error {}

export class ChallongeAPIError extends Error {}

export class TournamentNotFoundError extends UserError {
	tournamentId: string;

	constructor(tournamentId: string) {
		super(`Unknown tournament ${tournamentId}.`);
		this.tournamentId = tournamentId;
	}
}

export class UnauthorisedHostError extends UserError {
	hostId: string;
	tournamentId: string;

	constructor(hostId: string, tournamentId: string) {
		super(`User ${hostId} not authorised for tournament ${tournamentId}.`);
		this.hostId = hostId;
		this.tournamentId = tournamentId;
	}
}

export class UnauthorisedPlayerError extends UserError {
	playerId: string;
	tournamentId: string;

	constructor(playerId: string, tournamentId: string) {
		super(`User ${playerId} not a player in tournament ${tournamentId}.`);
		this.playerId = playerId;
		this.tournamentId = tournamentId;
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
