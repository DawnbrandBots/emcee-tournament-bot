import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ManualDeckSubmission } from "./ManualDeckSubmission";
import { ManualTournament } from "./ManualTournament";

/**
 * A Discord user engaging with Emcee. A user cannot "multiply-engage" with the
 * same tournament so a primary key is declared across the first two columns.
 */
@Entity()
export class ManualParticipant extends BaseEntity {
	/// Explicitly specify the foreign key for the below relation to avoid jank ORM naming.
	@PrimaryColumn()
	tournamentId!: number;

	/// Discord snowflake for the user. A uint64 is at most 20 digits in decimal.
	@PrimaryColumn({ length: 20 })
	discordId!: string;

	/// Master Duel friend code, if in use
	@Column({ type: "integer", nullable: true })
	friendCode?: number;

	/// Only meaningful for IPR tournaments, indicating if the participant has retired.
	@Column({ default: false })
	dropped!: boolean;

	/// The ORM relationship for the above foreign key. Must always exist or this entity is meaningless.
	@ManyToOne(() => ManualTournament, tournament => tournament.participants, {
		onDelete: "CASCADE"
	})
	@JoinColumn({ name: "tournamentId" })
	tournament!: ManualTournament;

	/// Deck submission. If present, this participant is either submitted pending approval or confirmed.
	@OneToOne(() => ManualDeckSubmission, confirmed => confirmed.participant, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	deck?: ManualDeckSubmission;
}
