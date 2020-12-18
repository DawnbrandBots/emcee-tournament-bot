import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

export enum TournamentStatus {
	PREPARING = "preparing",
	IPR = "in progress",
	COMPLETE = "complete"
}

/**
 * The main entity for all information related to one tournament.
 */
@Entity()
export class ChallongeTournament extends BaseEntity {
	/// Challonge ID. Guaranteed to be unique on Challonge and meaningful.
	@PrimaryColumn()
	tournamentId!: string;

	/// User-provided short name.
	@Column()
	name!: string;

	/// User-provided description of arbitrary length.
	@Column("text")
	description!: string;

	/// Discord server snowflake. A uint64 is at most 20 digits in decimal.
	@Column({ length: 20 })
	owningDiscordServer!: string;

	/// An array of Discord user snowflakes. Whenever hosts are queried, the rest
	/// of the tournament information is wanted anyway. Should be distinct.
	@Column("varchar", { length: 20, array: true, default: "{}" })
	hosts!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	@Column("varchar", { length: 20, array: true, default: "{}" })
	publicChannels!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	@Column("varchar", { length: 20, array: true, default: "{}" })
	privateChannels!: string[];

	/// Simple state progression in the listed order above.
	@Column({ type: "enum", enum: TournamentStatus, default: TournamentStatus.PREPARING })
	status!: TournamentStatus;

	/// Optional maximum capacity of this tournament. 0 indicates no limit. Negatives invalid.
	@Column({ default: 0 })
	participantLimit!: number;

	/// Current round of a running tournament. Should be zero if preparing. Negatives invalid.
	@Column({ default: 0 })
	currentRound!: number;

	/// Total rounds of Swiss. Negatives invalid.
	@Column({ default: 0 })
	totalRounds!: number;

	/// The ORM relationship to the registration messages that identify this tournament.
	@OneToMany(() => RegisterMessage, rm => rm.tournament, { cascade: true })
	registerMessages!: RegisterMessage[];

	/// The ORM relationship for all participants, pending and confirmed.
	@OneToMany(() => Participant, participant => participant.tournament, { cascade: true })
	participants!: Participant[];

	/// The ORM relationship for just the confirmed participants.
	@OneToMany(() => ConfirmedParticipant, participant => participant.tournament, { cascade: true, eager: true })
	confirmed!: ConfirmedParticipant[];
}
