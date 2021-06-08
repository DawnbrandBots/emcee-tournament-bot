import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";
import { Participant } from "./Participant";

/**
 * Additional information for a Participant once they have submitted a valid deck.
 */
@Entity()
export class ConfirmedParticipant extends BaseEntity {
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

	/// Did this participant forfeit a match and drop?
	@Column({ default: 0 })
	droppedDuringRound!: number;

	/// Did this participant drop after their match concluded but before the next round started?
	@Column({ default: 0 })
	droppedAfterRound!: number;

	/// Identical to Participant.tournament. Must always exist or this entity is meaningless.
	@ManyToOne(() => ChallongeTournament, tournament => tournament.confirmed, { primary: true, onDelete: "CASCADE" })
	@JoinColumn({ name: "tournamentId" })
	tournament!: ChallongeTournament;

	/// The ORM relationship to the Participant with the same primary keys. Must always exist.
	@OneToOne(() => Participant, participant => participant.confirmed, { onDelete: "CASCADE" })
	@JoinColumn()
	participant!: Participant;
}
