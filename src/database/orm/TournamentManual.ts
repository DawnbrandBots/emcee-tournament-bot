import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { CardVector } from "ydeck";
import { TournamentStatus } from "../interface";
import { ParticipantManualBase } from "./ParticipantManualBase";
import { ParticipantManualSubmitted } from "./ParticipantManualSubmitted";
import { RegisterMessageManual } from "./RegisterMessageManual";

/**
 * The main entity for all information related to one tournament.
 */
@Entity()
export class TournamentManual extends BaseEntity {
	/// Arbitrary ID for tournament
	@PrimaryColumn()
	tournamentId!: string;

	/// User-provided short name.
	@Column()
	name!: string;

	// TODO: Do we need this? I'm thinking not
	/// User-provided description of arbitrary length.
	@Column("text")
	description!: string;

	/// Discord server snowflake. A uint64 is at most 20 digits in decimal.
	@Column({ length: 20 })
	owningDiscordServer!: string;

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
	@OneToMany(() => RegisterMessageManual, rm => rm.tournament, { cascade: true, onDelete: "CASCADE" })
	registerMessages!: RegisterMessageManual[];

	/// The ORM relationship for all participants, pending or submitted (incl confirmed).
	@OneToMany(() => ParticipantManualBase, participant => participant.tournament, {
		cascade: true,
		onDelete: "CASCADE"
	})
	participants!: ParticipantManualBase[];

	/// The ORM relationship for just the submitted participants (incl confirmed).
	@OneToMany(() => ParticipantManualSubmitted, participant => participant.tournament, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	submitted!: ParticipantManualSubmitted[];
}
