import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

export enum TournamentStatus {
	PREPARING = "preparing",
	IPR = "in progress",
	COMPLETE = "complete"
}

@Entity()
export class ChallongeTournament {
	@PrimaryColumn()
	tournamentId!: string;

	@Column()
	name!: string;

	@Column("text")
	description!: string;

	@Column({ length: 20 })
	owningDiscordServer!: string;

	@Column("varchar", { length: 20, array: true, default: "{}" })
	hosts!: string[];

	@Column("varchar", { length: 20, array: true, default: "{}" })
	publicChannels!: string[];

	@Column("varchar", { length: 20, array: true, default: "{}" })
	privateChannels!: string[];

	@Column({ type: "enum", enum: TournamentStatus, default: TournamentStatus.PREPARING })
	status!: TournamentStatus;

	@Column({ default: 0 })
	participantLimit!: number;

	@Column({ default: 0 })
	currentRound!: number;

	@Column({ default: 0 })
	totalRounds!: number;

	@OneToMany(() => RegisterMessage, rm => rm.tournament, { cascade: true })
	registerMessages!: RegisterMessage[];

	@OneToMany(() => Participant, participant => participant.tournament, { cascade: true })
	participants!: Participant[];

	@OneToMany(() => ConfirmedParticipant, participant => participant.tournament, { cascade: true })
	confirmed!: ConfirmedParticipant[];
}
