import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";
import { Participant } from "./Participant";

@Entity()
export class ConfirmedParticipant {
	@ManyToOne(() => ChallongeTournament, tournament => tournament.confirmed, { primary: true })
	tournament!: ChallongeTournament;

	@OneToOne(() => Participant, participant => participant.confirmed)
	@JoinColumn()
	participant!: Participant;

	@PrimaryColumn()
	discordId!: string;

	@Column("text")
	deck!: string;

	@Column()
	hasBye!: boolean;
}
