import { Document, Schema, model } from "mongoose";

export interface Tournament extends Document {
	name?: string;
	description?: string;
	organizers: number[];
	owningDiscordServer: number;
	discordChannels: number[];
	status: "preparing" | "in progress" | "complete",
	participantLimit: number;
	confirmedParticipants: {
		discord: number,
		deck: {
			main: number[],
			extra: number[],
			side: number[]
		}
	};
	pendingParticipants: number[];
}

export const TournamentSchema = new Schema({
	name: { type: String, default: "" },
	description: { type: String, default: "" },
	organizers: { type: [Number], required: true },
	owningDiscordServer: { type: Number, required: true },
	discordChannels: { type: [Number], required: true },
	status: {
		type: String,
		enum: ["preparing", "in progress", "complete"],
		required: true,
		default: "preparing",
	},
	participantLimit: { type: Number, required: true, default: 0 },
	confirmedParticipants: [{
		discord: { type: Number, required: true },
		deck: {
			main: { type: [Number], required: true },
			extra: { type: [Number], required: true },
			side: { type: [Number], required: true },
		}
	}],
	pendingParticipants: { type: [Number], required: true, default: [] },
});

export const TournamentModel = model<Tournament>("Tournament", TournamentSchema);
