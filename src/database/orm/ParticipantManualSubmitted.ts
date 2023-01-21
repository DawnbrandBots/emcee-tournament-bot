import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { TournamentManual } from "./TournamentManual";
import { ParticipantManualBase } from "./ParticipantManualBase";

/**
 * Additional information for a Participant once they have submitted a valid deck.
 */
@Entity()
export class ParticipantManualSubmitted extends BaseEntity {
	/// Identical to Participant.tournamentId
	@PrimaryColumn()
	tournamentId!: string;

	/// Identical to Participant.discordId
	@PrimaryColumn({ length: 20 })
	discordId!: string;

	/// The submitted decklist. Store URLs to screenshots on discord.
	@Column("text")
	deck!: string[];

	/// Whether or not the user's decklist has been approved by a host.
	@Column("boolean")
	confirmed!: boolean;

	/// Should this participant have a free round one bye?
	@Column({ default: false })
	hasBye!: boolean;

	/// Identical to Participant.tournament. Must always exist or this entity is meaningless.
	@ManyToOne(() => TournamentManual, tournament => tournament.submitted, { primary: true, onDelete: "CASCADE" })
	@JoinColumn({ name: "tournamentId" })
	tournament!: TournamentManual;

	/// The ORM relationship to the Participant with the same primary keys. Must always exist.
	@OneToOne(() => ParticipantManualBase, participant => participant.submitted, { onDelete: "CASCADE" })
	@JoinColumn()
	participant!: ParticipantManualBase;
}
