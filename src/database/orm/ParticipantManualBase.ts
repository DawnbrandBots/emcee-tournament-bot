import { BaseEntity, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { TournamentManual } from "./TournamentManual";
import { ParticipantManualSubmitted } from "./ParticipantManualSubmitted";

/**
 * A Discord user engaging with Emcee. A user cannot "multiply-engage" with the
 * same tournament so a primary key is declared across the first two columns.
 */
@Entity()
export class ParticipantManualBase extends BaseEntity {
	/// Explicitly specify the foreign key for the below relation to avoid jank ORM naming.
	@PrimaryColumn()
	tournamentId!: string;

	/// Discord snowflake for the user. A uint64 is at most 20 digits in decimal.
	@PrimaryColumn({ length: 20 })
	discordId!: string;

	/// The ORM relationship for the above foreign key. Must always exist or this entity is meaningless.
	@ManyToOne(() => TournamentManual, tournament => tournament.participants, {
		primary: true,
		onDelete: "CASCADE"
	})
	@JoinColumn({ name: "tournamentId" })
	tournament!: TournamentManual;

	/// Extra information if this participant has submitted to this tournament.
	@OneToOne(() => ParticipantManualSubmitted, confirmed => confirmed.participant, {
		cascade: true,
		eager: true,
		onDelete: "CASCADE"
	})
	submitted?: ParticipantManualSubmitted;
}
