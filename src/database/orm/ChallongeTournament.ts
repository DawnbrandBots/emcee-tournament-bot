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

	@Column()
	owningDiscordServer!: string;

	@Column({ array: true, default: "{}" })
	hosts!: string[];

	@Column({ array: true, default: "{}" })
	publicChannels!: string[];

	@Column({ array: true, default: "{}" })
	privateChannels!: string[];

	@Column({ type: "enum", enum: TournamentStatus, default: TournamentStatus.PREPARING })
	status!: TournamentStatus;

	@Column({ default: 0 })
	participantLimit!: number;

	@Column({ default: 0 })
	currentRound!: number;

	@Column({ default: 0 })
	totalRounds!: number;

	@OneToMany(() => RegisterMessage, rm => rm.tournament)
	registerMessages!: RegisterMessage[];

	@OneToMany(() => Participant, participant => participant.tournament)
	participants!: Participant[];

	@OneToMany(() => ConfirmedParticipant, participant => participant.tournament)
	confirmed!: ConfirmedParticipant[];
}
