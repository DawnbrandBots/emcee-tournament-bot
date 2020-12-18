import "reflect-metadata";
import { createConnection } from "typeorm";
import { postgresqlUrl } from "../../config/env";
import logger from "../../util/logger";
import { ChallongeTournament, TournamentStatus } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Countdown } from "./Countdown";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

createConnection({
	type: "postgres",
	url: postgresqlUrl,
	entities: [ChallongeTournament, ConfirmedParticipant, Countdown, Participant, RegisterMessage],
	logging: true,
	synchronize: process.env.NODE_ENV === "development"
})
	.then(() => logger.info(`Connected to PostgreSQL via TypeORM`))
	.catch(logger.error);

export { ChallongeTournament, ConfirmedParticipant, Countdown, Participant, TournamentStatus, RegisterMessage };
