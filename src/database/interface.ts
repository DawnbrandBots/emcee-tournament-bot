import { TournamentStatus } from "./orm";

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
	status: TournamentStatus;
	hosts: string[];
	players: string[]; // list of IDs, for more info use findPlayer();
	server: string;
	publicChannels: string[];
	privateChannels: string[];
	byes: string[];
	findPlayer: (id: string) => DatabasePlayer | undefined;
}

export interface SynchroniseTournament {
	name: string;
	description: string;
	players: { challongeId: number; discordId: string }[];
}
