import "reflect-metadata";
import { createConnection } from "typeorm";
import logger from "../../util/logger";
import { ChallongeTournament, TournamentStatus } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Countdown } from "./Countdown";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

export async function initializeConnection(postgresqlUrl: string): Promise<void> {
	await createConnection({
		type: "postgres",
		url: postgresqlUrl,
		entities: [ChallongeTournament, ConfirmedParticipant, Countdown, Participant, RegisterMessage],
		logging: true,
		synchronize: process.env.NODE_ENV === "development"
	});
	logger.info(`Connected to PostgreSQL via TypeORM`);
}

export { ChallongeTournament, ConfirmedParticipant, Countdown, Participant, TournamentStatus, RegisterMessage };
