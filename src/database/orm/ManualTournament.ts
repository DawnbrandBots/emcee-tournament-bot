import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TournamentStatus } from "../interface";
import { ManualDeckSubmission } from "./ManualDeckSubmission";
import { ManualParticipant } from "./ManualParticipant";

/**
 * A tournament with manual deck verification and no round management or Challonge dependency.
 */
@Entity()
export class ManualTournament extends BaseEntity {
	@PrimaryGeneratedColumn()
	tournamentId!: number;

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
	// @Column("varchar", { length: 20, array: true, default: "{}" })
	// https://github.com/typeorm/typeorm/issues/6990
	@Column("json", { default: [] })
	hosts!: string[];

	/// Discord channel snowflake. A uint64 is at most 20 digits in decimal.
	@Column({ length: 20, nullable: true })
	publicChannel?: string;

	/// Discord channel snowflake. A uint64 is at most 20 digits in decimal.
	@Column({ length: 20, nullable: true })
	privateChannel?: string;

	/// Simple state progression in the listed order above.
	@Column({ type: "enum", enum: TournamentStatus, default: TournamentStatus.PREPARING })
	status!: TournamentStatus;

	/// Optional maximum capacity of this tournament. 0 indicates no limit. Negatives invalid.
	@Column({ default: 0 })
	participantLimit!: number;

	/// Discord role snowflake.
	@Column({ length: 20 })
	participantRole!: string;

	/// Request Master Duel friend codes from participants upon registration?
	@Column()
	requireFriendCode!: boolean;

	/// Discord message snowflake for the registration message in the public channel.
	@Column({ length: 20, nullable: true })
	registerMessage?: string;

	/// The ORM relationship for all participants, registering, submitted, confirmed, and dropped.
	@OneToMany(() => ManualParticipant, participant => participant.tournament, { cascade: true, onDelete: "CASCADE" })
	participants!: ManualParticipant[];

	/// The ORM relationship for submitted decklists.
	@OneToMany(() => ManualDeckSubmission, deck => deck.tournament, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	decks!: ManualDeckSubmission[];
}
