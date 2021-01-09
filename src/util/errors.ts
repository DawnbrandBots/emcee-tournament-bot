import { TournamentStatus } from "../database/orm";

export class UserError extends Error {}

export class ChallongeAPIError extends Error {}

export class ChallongeIDConflictError extends ChallongeAPIError {
	constructor(readonly tournamentId: string) {
		super(`Tournament ID ${tournamentId} already taken.`);
	}
}

export class TournamentNotFoundError extends UserError {
	constructor(readonly tournamentId: string) {
		super(`Unknown tournament ${tournamentId}.`);
		this.tournamentId = tournamentId;
	}
}

export class UnauthorisedHostError extends UserError {
	constructor(readonly hostId: string, readonly tournamentId: string) {
		super(`User ${hostId} not authorised for tournament ${tournamentId}.`);
	}
}

export class UnauthorisedPlayerError extends UserError {
	constructor(readonly playerId: string, readonly tournamentId: string) {
		super(`User ${playerId} not a player in tournament ${tournamentId}.`);
	}
}

export class UnauthorisedTOError extends UserError {
	constructor(readonly to: string) {
		super(`User ${to} not authorised to create tournaments in this server.`);
	}
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

export class AssertStatusError extends UserError {
	constructor(
		readonly tournamentId: string,
		readonly requiredStatus: TournamentStatus,
		readonly currentStatus: TournamentStatus
	) {
		super(`Tournament ${tournamentId} must be ${requiredStatus}, but is currently ${currentStatus}.`);
	}
}

export class MiscInternalError extends Error {}
