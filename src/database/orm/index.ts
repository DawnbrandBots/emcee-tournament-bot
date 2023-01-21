import "reflect-metadata";
import { createConnection } from "typeorm";
import { getLogger } from "../../util/logger";
import { TournamentChallonge } from "./TournamentChallonge";
import { ParticipantChallongeConfirmed } from "./ParticipantChallongeConfirmed";
import { Countdown } from "./Countdown";
import { ParticipantChallongeBase } from "./ParticipantChallongeBase";
import { RegisterMessageChallonge } from "./RegisterMessageChallonge";

const logger = getLogger("typeorm");

export async function initializeConnection(postgresqlUrl: string): Promise<void> {
	await createConnection({
		type: "postgres",
		url: postgresqlUrl,
		entities: [
			TournamentChallonge,
			ParticipantChallongeConfirmed,
			Countdown,
			ParticipantChallongeBase,
			RegisterMessageChallonge
		],
		logging: "all",
		logger: "debug",
		synchronize: true // TODO: process.env.NODE_ENV === "development" and investigate migrations
	});
	logger.info(`Connected to PostgreSQL via TypeORM`);
}

export {
	TournamentChallonge as ChallongeTournament,
	ParticipantChallongeConfirmed as ConfirmedParticipant,
	Countdown,
	ParticipantChallongeBase as Participant,
	RegisterMessageChallonge as RegisterMessage
};
