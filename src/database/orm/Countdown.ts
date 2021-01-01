import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Represents a persistent scheduled timer that will update a Discord message
 * on a given interval and send out a final message.
 */
@Entity()
export class Countdown extends BaseEntity {
	/// No user-provided identifier, so we use the default autoincrement.
	@PrimaryGeneratedColumn()
	id!: number;

	/// Store the end time as a UTC timestamp in Postgres, avoid shenanigans.
	@Column("timestamptz")
	end!: Date;

	/// Discord channel snowflake. A uint64 is at most 20 digits in decimal.
	@Column({ length: 20 })
	channelId!: string;

	/// Discord message snowflake. With the above, these uniquely identify a message.
	@Column({ length: 20 })
	messageId!: string;

	/// For when the time arrives. Arbitrary payload size.
	@Column("text")
	finalMessage!: string;

	/// Update the Discord message on seconds that are a multiple of this number.
	@Column()
	cronIntervalSeconds!: number;
}
