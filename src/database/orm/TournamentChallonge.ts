import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { CardVector } from "ydeck";
import { TournamentFormat, TournamentStatus } from "../interface";
import { ParticipantChallongeConfirmed } from "./ParticipantChallongeConfirmed";
import { Countdown } from "./Countdown";
import { ParticipantChallongeBase } from "./ParticipantChallongeBase";
import { RegisterMessageChallonge } from "./RegisterMessageChallonge";

/**
 * The main entity for all information related to one tournament.
 */
@Entity()
export class TournamentChallonge extends BaseEntity {
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

	/// Formats supported by Challonge, named the same way.
	@Column({ type: "enum", enum: TournamentFormat, default: TournamentFormat.SWISS })
	format!: TournamentFormat;

	/// An array of Discord user snowflakes. Whenever hosts are queried, the rest
	/// of the tournament information is wanted anyway. Should be distinct.
	// @Column("varchar", { length: 20, array: true, default: "{}" })
	// https://github.com/typeorm/typeorm/issues/6990
	@Column("json", { default: [] })
	hosts!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	// @Column("varchar", { length: 20, array: true, default: "{}" })
	@Column("json", { default: [] })
	publicChannels!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	// @Column("varchar", { length: 20, array: true, default: "{}" })
	@Column("json", { default: [] })
	privateChannels!: string[];

	/// Simple state progression in the listed order above.
	@Column({ type: "enum", enum: TournamentStatus, default: TournamentStatus.PREPARING })
	status!: TournamentStatus;

	/// Optional maximum capacity of this tournament. 0 indicates no limit. Negatives invalid.
	@Column({ default: 0 })
	participantLimit!: number;

	@Column("text", {
		nullable: true,
		transformer: {
			from: (raw: string | null) => (raw ? new Map(JSON.parse(raw)) : undefined),
			to: (entity?: CardVector) => entity && JSON.stringify([...entity.entries()])
		}
	})
	allowVector?: CardVector;

	/// The ORM relationship to the registration messages that identify this tournament.
	@OneToMany(() => RegisterMessageChallonge, rm => rm.tournament, { cascade: true, onDelete: "CASCADE" })
	registerMessages!: RegisterMessageChallonge[];

	/// The ORM relationship for all participants, pending and confirmed.
	@OneToMany(() => ParticipantChallongeBase, participant => participant.tournament, {
		cascade: true,
		onDelete: "CASCADE"
	})
	participants!: ParticipantChallongeBase[];

	/// The ORM relationship for just the confirmed participants.
	@OneToMany(() => ParticipantChallongeConfirmed, participant => participant.tournament, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	confirmed!: ParticipantChallongeConfirmed[];

	@OneToMany(() => Countdown, countdown => countdown.tournament, { cascade: true, onDelete: "CASCADE" })
	countdowns!: Countdown[];
}
