import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ChallongeTournament } from "./ChallongeTournament";

/**
 * A registration message for a tournament, which can be used to identify a tournament.
 */
@Entity()
export class RegisterMessage extends BaseEntity {
	/// Explicitly specify the foreign key for the below relation to avoid jank ORM naming.
	@Column()
	tournamentId!: string;

	/// Discord channel snowflake. A uint64 is at most 20 digits in decimal.
	@PrimaryColumn({ length: 20 })
	channelId!: string;

	/// Discord message snowflake. With the above, these uniquely identify a message.
	@PrimaryColumn({ length: 20 })
	messageId!: string;

	/// The ORM relationship for the above foreign key. Must always exist or this entity is meaningless.
	@ManyToOne(() => ChallongeTournament, tournament => tournament.registerMessages, {
		eager: true,
		nullable: false,
		onDelete: "CASCADE"
	})
	@JoinColumn({ name: "tournamentId" })
	tournament!: ChallongeTournament;
}
