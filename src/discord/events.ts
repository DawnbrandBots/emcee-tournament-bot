import { Guild, Message, PossiblyUncachedMessage, Emoji, Client, TextChannel, PrivateChannel } from "eris";
import logger from "../logger";
import CommandDispatcher, { ErisDiscordSender } from "./dispatch";

export default class EmceeListener {
	protected botClient: Client; // possibly drop in favour of just the needed components
	protected dispatcher: CommandDispatcher;
	protected readonly checkEmoji: string;

	constructor(botClient: Client, dispatcher: CommandDispatcher, checkEmoji: string) {
		this.botClient = botClient;
		this.dispatcher = dispatcher;
		this.checkEmoji = checkEmoji;
	}

	ready(): void {
		logger.info(`Logged in as ${this.botClient.user.username} - ${this.botClient.user.id}`);
	}

	guildCreate(guild: Guild): void {
		this.dispatcher.roleProvider.create(guild).catch(logger.error);
	}

	async messageCreate(message: Message): Promise<void> {
		if (message.author.bot) {
			return;
		}
		if (message.channel instanceof TextChannel) {
			// Message<T>::channel has type T
			await this.dispatcher.dispatch(message as Message<TextChannel>);
		} else if (message.channel instanceof PrivateChannel) {
			// TODO: confirm deck stuff plus optional help
		}
	}

	async messageDelete(message: PossiblyUncachedMessage): Promise<void> {
		try {
			await this.dispatcher.tournamentController.removeAnnouncement(
				message.id,
				message.channel.id
			);
		} catch (e) {
			logger.error(e.message);
		}

	}

	async messageReactionAdd(
		message: PossiblyUncachedMessage,
		emoji: Emoji,
		userId: string
	): Promise<void> {
		if (userId === this.botClient.user.id || emoji.name != this.checkEmoji) {
			return;
		}
		try {
			await this.dispatcher.participantController.addPending(
				new ErisDiscordSender(
					message,
					this.dispatcher.getChannel,
					this.dispatcher.getDMChannel
				),
				userId
			);
		} catch(e) {
			logger.error(e);
		}
	}

	async messageReactionRemove(
		message: PossiblyUncachedMessage,
		emoji: Emoji,
		userId: string
	): Promise<void> {
		if (userId === this.botClient.user.id || emoji.name != this.checkEmoji) {
			return;
		}
		try {
			await this.dispatcher.participantController.drop(
				new ErisDiscordSender(
					message,
					this.dispatcher.getChannel,
					this.dispatcher.getDMChannel
				),
				userId
			);
		} catch (e) {
			logger.error(e);
		}
	}
}
