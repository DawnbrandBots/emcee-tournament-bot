import { getConnection } from "typeorm";
import { Countdown } from "../database/orm";
import { getLogger } from "../util/logger";

const logger = getLogger("timer");

export interface PersistentTimerDiscordDelegate {
	/**
	 * Sends message to the channel specified by channelId and returns the snowflake
	 * for the created message. May throw exceptions.
	 */
	sendMessage: (channelId: string, message: string) => string | Promise<string>;
	/**
	 * Edits the specified message, replacing it with the newMessage. May throw exceptions.
	 */
	editMessage: (channelId: string, messageId: string, newMessage: string) => void | Promise<void>;
}

/**
 * Because this timer is not considered ready until the corresponding Discord
 * message is sent and the backing database entity is serialized, the constructor
 * is not public and only accessible through a static async create function.
 *
 * States of the object:
 *   init: constructor called and the timer is installed, but the entity is not serialized
 *   ready: after create returns, everything is ready for use, and isActive()
 *   done: either the timer ran out or was aborted, so do not use the serialized entity
 */
export class PersistentTimer {
	protected interval?: NodeJS.Timeout;

	/// This constructor has side effects as it immediately starts the timer!
	protected constructor(protected entity: Countdown, protected discord: PersistentTimerDiscordDelegate) {
		this.interval = setInterval(() => this.tick(), 1000);
	}

	public static async create(
		discord: PersistentTimerDiscordDelegate,
		end: Date,
		channelId: string,
		finalMessage: string,
		cronIntervalSeconds: number,
		tournamentId?: string
	): Promise<PersistentTimer> {
		// TODO: check for end <= now
		const endMilli = end.getTime();
		const nowMilli = Date.now();
		const left = this.formatTime(endMilli - nowMilli);
		const messageId = await discord.sendMessage(channelId, `Time left in the round: \`${left}\``);

		const entity = new Countdown();
		entity.end = end;
		entity.channelId = channelId;
		entity.messageId = messageId;
		entity.finalMessage = finalMessage;
		entity.cronIntervalSeconds = cronIntervalSeconds;
		entity.tournamentId = tournamentId;

		const timer = new PersistentTimer(entity, discord);

		try {
			await entity.save();
		} catch (error) {
			// We let the timer run but we log the warning that it won't be persisted.
			// This probably means we are trying to save invalid values to the database.
			logger.warn(error);
		}
		return timer;
	}

	public static async loadAll(discord: PersistentTimerDiscordDelegate): Promise<PersistentTimer[]> {
		const entities = await Countdown.find();
		const nowMilli = Date.now();
		// Replace with for-of if too inefficient
		const active = entities
			.filter(entity => entity.end.getTime() > nowMilli)
			.map(entity => new PersistentTimer(entity, discord));

		// Prune expired timers after initializing the active ones
		try {
			await getConnection().transaction(async entityManager => {
				for (const entity of entities) {
					if (entity.end.getTime() <= nowMilli) {
						// TODO: update timer and send final message?
						await entityManager.remove(entity);
					}
				}
			});
		} catch (err) {
			logger.error(err);
		}
		return active;
	}

	public get tournament(): string | undefined {
		return this.entity.tournamentId;
	}

	public isActive(): boolean {
		return this.interval !== undefined;
	}

	public async abort(): Promise<void> {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = undefined;
			try {
				await this.entity.remove();
			} catch (error) {
				// The interval is already cleared so there will be no visible side effects
				// in this bot process or thread.
				logger.warn(error);
			}
		}
	}

	/// Only to be called by setInterval
	protected async tick(): Promise<void> {
		const now = new Date();
		if (this.entity.end <= now) {
			try {
				await this.discord.sendMessage(this.entity.channelId, this.entity.finalMessage);
			} catch (error) {
				logger.warn(error);
			}
			await this.abort();
		}
		const secondsRemaining = Math.ceil((now.getTime() - this.entity.end.getTime()) / 1000);
		if (secondsRemaining % this.entity.cronIntervalSeconds == 0) {
			const left = PersistentTimer.formatTime(this.entity.end.getTime() - Date.now());
			try {
				await this.discord.editMessage(
					this.entity.channelId,
					this.entity.messageId,
					`Time left in the round: \`${left}\``
				);
			} catch (error) {
				// Most likely culprit: the message was removed
				logger.warn(`tick: could not edit ${this.entity.channelId} ${this.entity.messageId}`);
				logger.warn(error);
			}
		}
	}

	public static formatTime(milli: number): string {
		const minutes = Math.floor(milli / 1000 / 60);
		const seconds = Math.floor(milli / 1000) % 60;
		return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
}
