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
		// Message<T>::channel has type T but the type system fails to infer this
		if (message.channel instanceof TextChannel) {
			await this.dispatcher.dispatch(message as Message<TextChannel>);
		} else if (message.channel instanceof PrivateChannel) {
			await this.dispatcher.participantController.confirmPending(
				this.dispatcher.getChannel,
				message as Message<PrivateChannel>
			);
			// Add help message here?
		}
	}

	async messageDelete(message: PossiblyUncachedMessage): Promise<void> {
		try {
			await this.dispatcher.tournamentController.removeAnnouncement(
				new ErisDiscordSender(
					message,
					this.dispatcher.getChannel,
					this.dispatcher.getDMChannel,
					this.dispatcher.deleteMessage
				),
				message.id,
				message.channel.id
			);
		} catch (e) {
			logger.error(e);
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
					this.dispatcher.getDMChannel,
					this.dispatcher.deleteMessage
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
					this.dispatcher.getDMChannel,
					this.dispatcher.deleteMessage
				),
				userId
			);
		} catch (e) {
			logger.error(e);
		}
	}
}
