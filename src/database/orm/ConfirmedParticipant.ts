import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";
import { Participant } from "./Participant";

@Entity()
export class ConfirmedParticipant {
	@PrimaryColumn()
	tournamentId!: string;

	@PrimaryColumn({ length: 20 })
	discordId!: string;

	@Column("text")
	deck!: string;

	@Column()
	hasBye!: boolean;

	@ManyToOne(() => ChallongeTournament, tournament => tournament.confirmed, { primary: true })
	@JoinColumn({ name: "tournamentId" })
	tournament!: ChallongeTournament;

	@OneToOne(() => Participant, participant => participant.confirmed)
	participant!: Participant;
}
