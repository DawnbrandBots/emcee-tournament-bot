import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Countdown {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column("timestamptz")
	end!: Date;

	@Column({ length: 20 })
	channelId!: string;

	@Column({ length: 20 })
	messageId!: string;

	@Column("text")
	finalMessage!: string;

	@Column()
	updateIntervalMilli!: number;
}
