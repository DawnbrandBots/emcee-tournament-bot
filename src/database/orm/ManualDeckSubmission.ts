import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ManualParticipant } from "./ManualParticipant";
import { ManualTournament } from "./ManualTournament";

/**
 * Additional information for a ManualParticipant once they have submitted a deck for manual approval.
 */
@Entity()
export class ManualDeckSubmission extends BaseEntity {
	/// Identical to ManualParticipant.tournamentId
	@PrimaryColumn()
	tournamentId!: number;

	/// Identical to ManualParticipant.discordId
	@PrimaryColumn({ length: 20 })
	discordId!: string;

	/// The submitted decklist, whatever form is appropriate.
	@Column("text")
	content!: string;

	/// Has the submitted decklist been approved by hosts? If so, the corresponding participant is confirmed.
	@Column({ default: false })
	approved!: boolean;

	/// An optional custom label for the deck by hosts. Could be used for themes.
	@Column({ type: "text", nullable: true })
	label?: string;

	/// Identical to ManualParticipant.tournament. Must always exist or this entity is meaningless.
	@ManyToOne(() => ManualTournament, tournament => tournament.decks, { onDelete: "CASCADE" })
	@JoinColumn({ name: "tournamentId" })
	tournament!: ManualTournament;

	/// The ORM relationship to the ManualParticipant with the same primary keys. Must always exist.
	@OneToOne(() => ManualParticipant, participant => participant.deck, { onDelete: "CASCADE" })
	@JoinColumn([
		{ name: "tournamentId", referencedColumnName: "tournamentId" },
		{ name: "discordId", referencedColumnName: "discordId" }
	])
	participant!: ManualParticipant;
}
