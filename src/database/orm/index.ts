import "reflect-metadata";
import { createConnection } from "typeorm";
import { getLogger } from "../../util/logger";
import { ChallongeTournament } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Countdown } from "./Countdown";
import { ManualDeckSubmission } from "./ManualDeckSubmission";
import { ManualParticipant } from "./ManualParticipant";
import { ManualTournament } from "./ManualTournament";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

const logger = getLogger("typeorm");

export async function initializeConnection(postgresqlUrl: string): Promise<void> {
	if (process.env.SQLITE_DB) {
		await createConnection({
			type: "better-sqlite3",
			database: process.env.SQLITE_DB,
			entities: [
				ChallongeTournament,
				ConfirmedParticipant,
				Countdown,
				Participant,
				RegisterMessage,
				ManualTournament,
				ManualParticipant,
				ManualDeckSubmission
			],
			logging: "all",
			logger: "debug",
			synchronize: true
		});
		logger.info(`Connected to SQLite via TypeORM`);
	} else {
		await createConnection({
			type: "postgres",
			url: postgresqlUrl,
			entities: [
				ChallongeTournament,
				ConfirmedParticipant,
				Countdown,
				Participant,
				RegisterMessage,
				ManualTournament,
				ManualParticipant,
				ManualDeckSubmission
			],
			logging: "all",
			logger: "debug",
			synchronize: true // TODO: process.env.NODE_ENV === "development" and investigate migrations
		});
		logger.info(`Connected to PostgreSQL via TypeORM`);
	}
}

export {
	ChallongeTournament,
	ConfirmedParticipant,
	Countdown,
	Participant,
	RegisterMessage,
	ManualTournament,
	ManualParticipant,
	ManualDeckSubmission
};
