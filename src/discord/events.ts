import { Guild, Message, PossiblyUncachedMessage, Emoji, Client, TextChannel, PrivateChannel } from "eris";
import logger from "../logger";
import CommandDispatcher from "./dispatch";

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

	messageDelete(message: PossiblyUncachedMessage): void {
		// TODO: new controller action to remove register message,
		// and possibly deal with pending participants accordingly
		// depending on how many register messages are left?
	}

	async messageReactionAdd(
		message: PossiblyUncachedMessage,
		emoji: Emoji,
		userId: string
	): Promise<void> {
		if (userId === this.botClient.user.id || emoji.name != this.checkEmoji) {
			return;
		}
		// arguments: messageId
		// channelId
		// userId
		// DM channel
		// output error channel for hosts (subclass ErisDiscordWrapper)
		// this.dispatcher.participantController.addPending
	}

	async messageReactionRemove(
		message: PossiblyUncachedMessage,
		emoji: Emoji,
		userId: string
	): Promise<void> {
		if (userId === this.botClient.user.id || emoji.name != this.checkEmoji) {
			return;
		}
		// arguments: messageId
		// channelId
		// userId
		// DM channel
		// output error channel for hosts (subclass ErisDiscordWrapper)
		// this.dispatcher.participantController.drop
	}
}
