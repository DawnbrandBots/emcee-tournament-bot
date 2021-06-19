import { CardVector } from "ydeck";

export enum TournamentStatus {
	PREPARING = "preparing",
	IPR = "in progress",
	COMPLETE = "complete"
}

export enum TournamentFormat {
	SINGLE_ELIMINATION = "single elimination",
	DOUBLE_ELIMINATION = "double elimination",
	ROUND_ROBIN = "round robin",
	SWISS = "swiss",
	FREE_FOR_ALL = "free for all"
}

export interface DatabasePlayer {
	discordId: string;
	challongeId: number;
	deck: string;
}

export interface DatabaseMessage {
	messageId: string;
	channelId: string;
}

// interface structure WIP as fleshed out command-by-command
export interface DatabaseTournament {
	id: string;
	name: string;
	description: string;
	format: TournamentFormat;
	status: TournamentStatus;
	hosts: string[];
	players: DatabasePlayer[];
	server: string;
	publicChannels: string[];
	privateChannels: string[];
	byes: string[];
	allowVector?: CardVector;
	findPlayer: (id: string) => DatabasePlayer | undefined;
}

export interface DatabasePlayerWithTournament {
	challongeId: number;
	tournament: {
		name: string;
		privateChannels: string[];
	};
}

export interface SynchroniseTournament {
	name: string;
	description: string;
	players: { challongeId: number; discordId: string }[];
}
