import { Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";

@Entity()
export class RegisterMessage {
	@ManyToOne(() => ChallongeTournament, tournament => tournament.registerMessages)
	tournament!: ChallongeTournament;

	@PrimaryColumn()
	channelId!: string;

	@PrimaryColumn()
	messageId!: string;
}
