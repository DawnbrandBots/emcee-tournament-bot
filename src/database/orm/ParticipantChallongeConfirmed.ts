import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { TournamentChallonge } from "./TournamentChallonge";
import { ParticipantChallongeBase } from "./ParticipantChallongeBase";

/**
 * Additional information for a Participant once they have submitted a valid deck.
 */
@Entity()
export class ParticipantChallongeConfirmed extends BaseEntity {
	/// Identical to Participant.tournamentId
	@PrimaryColumn()
	tournamentId!: string;

	/// Identical to Participant.discordId
	@PrimaryColumn({ length: 20 })
	discordId!: string;

	/// Identifier on Challonge
	@Column()
	challongeId!: number;

	/// The submitted decklist. Store ydke:// URLs, the most compact and shareable form used.
	@Column("text")
	deck!: string;

	/// Should this participant have a free round one bye?
	@Column({ default: false })
	hasBye!: boolean;

	/// Identical to Participant.tournament. Must always exist or this entity is meaningless.
	@ManyToOne(() => TournamentChallonge, tournament => tournament.confirmed, { primary: true, onDelete: "CASCADE" })
	@JoinColumn({ name: "tournamentId" })
	tournament!: TournamentChallonge;

	/// The ORM relationship to the Participant with the same primary keys. Must always exist.
	@OneToOne(() => ParticipantChallongeBase, participant => participant.confirmed, { onDelete: "CASCADE" })
	@JoinColumn()
	participant!: ParticipantChallongeBase;
}
