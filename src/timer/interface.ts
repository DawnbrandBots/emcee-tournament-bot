import { DiscordInterface, DiscordMessageSent } from "../discord/interface";

export class TimerInterface {
	protected time: number; // seconds
	protected discord: DiscordInterface;
	protected channelId: string;
	protected message: DiscordMessageSent;
	protected finalMessage: string;
	protected interval: NodeJS.Timeout | undefined;
	constructor(
		mins: number,
		discord: DiscordInterface,
		channelId: string,
		message: DiscordMessageSent,
		finalMessage: string
	) {
		this.time = mins * 60; // mins to seconds
		this.discord = discord;
		this.channelId = channelId;
		this.message = message;
		this.finalMessage = finalMessage;
	}

	public static async create(
		mins: number,
		channelId: string,
		discord: DiscordInterface,
		finalMessage: string
	): Promise<TimerInterface> {
		const msg = await discord.sendMessage(channelId, `Time left in the round: \`${mins}:00\``);
		return new TimerInterface(mins, discord, channelId, msg, finalMessage);
	}

	public async abort(): Promise<void> {
		if (this.interval) {
			clearInterval(this.interval);
		}
	}
}
