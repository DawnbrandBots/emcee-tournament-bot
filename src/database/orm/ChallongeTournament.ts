import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { CardVector } from "ydeck";
import { TournamentFormat, TournamentStatus } from "../interface";
import { ConfirmedParticipant } from "./ConfirmedParticipant";
import { Countdown } from "./Countdown";
import { EnumColumn, JsonArrayColumn } from "./decorators";
import { Participant } from "./Participant";
import { RegisterMessage } from "./RegisterMessage";

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

	/// Formats supported by Challonge, named the same way.
	@EnumColumn(TournamentFormat, "SWISS")
	format!: TournamentFormat;

	/// An array of Discord user snowflakes. Whenever hosts are queried, the rest
	/// of the tournament information is wanted anyway. Should be distinct.
	@JsonArrayColumn()
	hosts!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	@JsonArrayColumn()
	publicChannels!: string[];

	/// An array of Discord channel snowflakes. Should be distinct.
	@JsonArrayColumn()
	privateChannels!: string[];

	/// Simple state progression in the listed order above.
	@EnumColumn(TournamentStatus, "PREPARING")
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
	@OneToMany(() => RegisterMessage, rm => rm.tournament, { cascade: true, onDelete: "CASCADE" })
	registerMessages!: RegisterMessage[];

	/// The ORM relationship for all participants, pending and confirmed.
	@OneToMany(() => Participant, participant => participant.tournament, { cascade: true, onDelete: "CASCADE" })
	participants!: Participant[];

	/// The ORM relationship for just the confirmed participants.
	@OneToMany(() => ConfirmedParticipant, participant => participant.tournament, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	confirmed!: ConfirmedParticipant[];

	@OneToMany(() => Countdown, countdown => countdown.tournament, { cascade: true, onDelete: "CASCADE" })
	countdowns!: Countdown[];
}
