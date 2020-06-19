import { Document, Schema, model } from "mongoose";

type DiscordID = string;

export interface Tournament extends Document {
	name?: string;
	description?: string;
	organizers: DiscordID[];
	owningDiscordServer: DiscordID;
	discordChannels: DiscordID[];
	status: "preparing" | "in progress" | "complete",
	participantLimit: DiscordID;
	confirmedParticipants: {
		discord: DiscordID,
		deck: {
			main: number[],
			extra: number[],
			side: number[]
		}
	};
	pendingParticipants: DiscordID[];
}

export const TournamentSchema = new Schema({
	name: { type: String, default: "" },
	description: { type: String, default: "" },
	organizers: { type: [String], required: true },
	owningDiscordServer: { type: String, required: true },
	discordChannels: { type: [String], required: true },
	status: {
		type: String,
		enum: ["preparing", "in progress", "complete"],
		required: true,
		default: "preparing",
	},
	participantLimit: { type: String, required: true, default: 0 },
	confirmedParticipants: [{
		discord: { type: String, required: true },
		deck: {
			main: { type: [Number], required: true },
			extra: { type: [Number], required: true },
			side: { type: [Number], required: true },
		}
	}],
	pendingParticipants: { type: [String], required: true, default: [] },
});

export const TournamentModel = model<Tournament>("Tournament", TournamentSchema);
