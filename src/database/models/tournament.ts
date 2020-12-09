import { Document, Schema, model } from "mongoose";

type DiscordID = string;

export interface TournamentDoc extends Document {
	name: string;
	description: string;
	challongeId: string;
	hosts: DiscordID[];
	owningDiscordServer: DiscordID;
	publicChannels: DiscordID[];
	privateChannels: DiscordID[];
	registerMessages: {
		channel: DiscordID;
		message: DiscordID;
	}[];
	status: "preparing" | "in progress" | "complete";
	participantLimit: DiscordID;
	confirmedParticipants: {
		challongeId: number;
		discord: DiscordID;
		deck?: string; // YDKE URL
	}[];
	pendingParticipants: DiscordID[];
	currentRound: number;
	totalRounds: number;
}

export const TournamentSchema = new Schema({
	name: { type: String, required: true },
	description: { type: String, required: true },
	challongeId: { type: String, required: true, unique: true },
	hosts: { type: [String], required: true },
	owningDiscordServer: { type: String, required: true },
	publicChannels: { type: [String], required: true },
	privateChannels: { type: [String], required: true },
	registerMessages: [
		{
			channel: { type: String, required: true },
			message: { type: String, required: true }
		}
	],
	status: {
		type: String,
		enum: ["preparing", "in progress", "complete"],
		required: true,
		default: "preparing"
	},
	participantLimit: { type: String, required: true, default: 0 },
	confirmedParticipants: [
		{
			challongeId: { type: Number, required: true },
			discord: { type: String, required: true },
			deck: { type: String, required: false } // YDKE url
		}
	],
	pendingParticipants: { type: [String], required: true, default: [] },
	currentRound: { type: Number, required: true, default: 0 },
	totalRounds: { type: Number, required: true, default: 0 }
});

export const TournamentModel = model<TournamentDoc>("Tournament", TournamentSchema);
