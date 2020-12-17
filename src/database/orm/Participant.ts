import { Entity, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";

@Entity()
export class Participant {
	@ManyToOne(() => ChallongeTournament, tournament => tournament.participants, { primary: true })
	tournament!: ChallongeTournament;

	@PrimaryColumn()
	discordId!: string;

	@OneToOne(() => ConfirmedParticipant, confirmed => confirmed.participant)
	confirmed?: ConfirmedParticipant;
}
