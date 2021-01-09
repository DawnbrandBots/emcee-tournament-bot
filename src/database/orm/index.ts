import "reflect-metadata";
import { createConnection } from "typeorm";
import { getLogger } from "../../util/logger";
import { ChallongeTournament } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Countdown } from "./Countdown";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

const logger = getLogger("typeorm");

export async function initializeConnection(postgresqlUrl: string): Promise<void> {
	await createConnection({
		type: "postgres",
		url: postgresqlUrl,
		entities: [ChallongeTournament, ConfirmedParticipant, Countdown, Participant, RegisterMessage],
		logging: "all",
		logger: "debug",
		synchronize: true // TODO: process.env.NODE_ENV === "development" and investigate migrations
	});
	logger.info(`Connected to PostgreSQL via TypeORM`);
}

export { ChallongeTournament, ConfirmedParticipant, Countdown, Participant, RegisterMessage };
