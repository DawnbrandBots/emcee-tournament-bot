import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Countdown {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column("timestamptz")
	end!: Date;

	@Column()
	channelId!: string;

	@Column()
	messageId!: string;

	@Column("text")
	finalMessage!: string;

	@Column()
	updateIntervalMilli!: number;
}
