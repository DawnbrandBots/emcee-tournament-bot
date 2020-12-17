import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";

@Entity()
export class RegisterMessage {
	@Column()
	tournamentId!: string;

	@PrimaryColumn({ length: 20 })
	channelId!: string;

	@PrimaryColumn({ length: 20 })
	messageId!: string;

	@ManyToOne(() => ChallongeTournament, tournament => tournament.registerMessages, { nullable: false })
	@JoinColumn({ name: "tournamentId" })
	tournament!: ChallongeTournament;
}
