import { Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";
import { ConfirmedParticipant } from "./ConfirmedParticipant";

@Entity()
export class Participant {
	@PrimaryColumn()
	tournamentId!: string;

	@PrimaryColumn({ length: 20 })
	discordId!: string;

	@ManyToOne(() => ChallongeTournament, tournament => tournament.participants, { primary: true })
	@JoinColumn({ name: "tournamentId" })
	tournament!: ChallongeTournament;

	@OneToOne(() => ConfirmedParticipant, confirmed => confirmed.participant)
	@JoinColumn()
	confirmed?: ConfirmedParticipant;
}
