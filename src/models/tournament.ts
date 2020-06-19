import { model, Schema } from "mongoose";

export const TournamentSchema = new Schema({
	name: { type: String, default: "" },
	description: { type: String, default: "" },
	organizers: { type: [Number], required: true },
	owningDiscordServer: { type: Number, required: true },
	discordChannels: { type: [Number], required: true },
	participantLimit: { type: Number, default: 0 },
	confirmedParticipants: [{
		discord: { type: Number, required: true },
		deck: {
			main: { type: [Number], required: true },
			extra: { type: [Number], required: true },
			side: { type: [Number], required: true },
		}
	}],
	pendingParticipants: { type: [Number], default: [] },
});

export const Tournament = model("Tournament", TournamentSchema);
