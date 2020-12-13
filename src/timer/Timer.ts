import { TimerInterface } from "./interface";
import { DiscordInterface, DiscordMessageSent } from "../discord/interface";

export class Timer extends TimerInterface {
	private interval: NodeJS.Timeout;
	private tickLength = 5; // seconds
	constructor(
		mins: number,
		discord: DiscordInterface,
		channelId: string,
		message: DiscordMessageSent,
		finalMessage: string
	) {
		super(mins, discord, channelId, message, finalMessage);
		this.interval = setInterval(async () => {
			// arrow function to not rebind "this"
			await this.tick();
		}, this.tickLength * 1000); // seconds
	}

	public static async create(
		mins: number,
		channelId: string,
		discord: DiscordInterface,
		finalMessage: string
	): Promise<Timer> {
		const msg = await discord.sendMessage(channelId, `Time left in the round: \`${mins}:00\``);
		return new Timer(mins, discord, channelId, msg, finalMessage);
	}

	private formatTime(): string {
		const minutes = Math.floor(this.time / 60);
		const seconds = this.time % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}

	private async tick(): Promise<void> {
		this.time -= this.tickLength;
		/* 5 minute warning feature not requested
		if (this.time === 5 * 60) {
			await this.discord.createMessage(`5 minutes left in the round! <@&${participantRole}>`);
		}
		*/
		if (this.time <= 0) {
			this.time = 0;
			await this.finish();
		}
		await this.message.edit(`**Time left in the round**: \`${this.formatTime()}\``);
	}

	private async finish(): Promise<void> {
		clearInterval(this.interval);
		await this.discord.sendMessage(this.channelId, this.finalMessage);
	}

	public async abort(): Promise<void> {
		clearInterval(this.interval);
	}
}
