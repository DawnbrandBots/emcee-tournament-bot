import { Message, TextChannel, Client, PossiblyUncachedMessage, Guild, GuildChannel } from "eris";
import logger from "../logger";
import { UserError, MiscInternalError } from "../errors";
import RoleProvider from "./role";
import { ControllerAction, DiscordWrapper, DiscordUserSubset, DiscordSender } from "../controllers/controller";
import ParticipantController from "../controllers/participant";
import PermissionController from "../controllers/permission";
import RoundController from "../controllers/round";
import TournamentController from "../controllers/tournament";

export type GetChannelDelegate = Client["getChannel"];
export type GetDMChannelDelegate = Client["getDMChannel"];
export type DeleteMessageDelegate = Client["deleteMessage"];

// Passed to each controller action to decouple them from Eris
export class ErisDiscordSender implements DiscordSender {
	protected readonly message: PossiblyUncachedMessage;
	protected readonly getChannel: GetChannelDelegate;
	protected readonly getDMChannel: GetDMChannelDelegate;
	protected readonly deleteMessage: DeleteMessageDelegate;

	constructor(
		message: PossiblyUncachedMessage,
		getChannel: GetChannelDelegate,
		getDMChannel: GetDMChannelDelegate,
		deleteMessage: DeleteMessageDelegate
	) {
		this.message = message;
		this.getChannel = getChannel;
		this.getDMChannel = getDMChannel;
		this.deleteMessage = deleteMessage;
	}

	// nothrow
	protected async addReaction(message: Message, reaction: string): Promise<void> {
		try {
			await message.addReaction(reaction);
		} catch (e) {
			logger.error(e);
		}
	}

	async sendMessage(content: string, reaction?: string): Promise<string> {
		return await this.sendChannelMessage(this.message.channel.id, content, reaction);
	}

	async sendDirectMessage(userId: string, content: string, reaction?: string): Promise<string> {
		const dm = await this.getDMChannel(userId);
		const message = await dm.createMessage(content);
		if (reaction) {
			await this.addReaction(message, reaction);
		}
		return message.id;
	}

	async sendChannelMessage(channelId: string, content: string, reaction?: string): Promise<string> {
		try {
			const channel = this.getChannel(channelId);
			if (!(channel instanceof TextChannel)) {
				throw new MiscInternalError(`Channel ${channelId} is not a TextChannel`);
			}
			const message = await channel.createMessage(content);
			if (reaction) {
				await this.addReaction(message, reaction);
			}
			return message.id;
		} catch (e) {
			logger.error(e);
			return "";
		}
	}

	currentMessageId(): string {
		return this.message.id;
	}

	currentChannelId(): string {
		return this.message.channel.id;
	}

	getServer(channelId: string): Guild {
		const channel = this.getChannel(channelId);
		if (!(channel instanceof GuildChannel)) {
			throw new MiscInternalError(`Channel ${channelId} is not a GuildChannel`);
		}
		return channel.guild;
	}

	async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
		this.deleteMessage(channelId, messageId);
	}
}

export class ErisDiscordWrapper extends ErisDiscordSender implements DiscordWrapper {
	protected message: Message<TextChannel>; // intentional masking since they are the same
	protected roleProvider: RoleProvider;

	constructor(
		message: Message<TextChannel>,
		roleProvider: RoleProvider,
		getChannel: GetChannelDelegate,
		getDMChannel: GetDMChannelDelegate,
		deleteMessage: DeleteMessageDelegate
	) {
		super(message, getChannel, getDMChannel, deleteMessage);
		this.message = message;
		this.roleProvider = roleProvider;
	}

	// @Override
	async sendMessage(content: string, reaction?: string): Promise<string> {
		// TODO: common handling for various Discord API exceptions
		const message = await this.message.channel.createMessage(content);
		if (reaction) {
			await this.addReaction(message, reaction);
		}
		return message.id;
	}

	isTextChannel(id: string): boolean {
		try {
			return this.getChannel(id) instanceof TextChannel;
		} catch (e) {
			// Error: "Invalid channel ID: <id>"
			return false;
		}
	}

	currentServer(): Guild {
		return this.message.channel.guild;
	}

	currentUser(): DiscordUserSubset {
		return this.message.author;
	}

	async assertUserPrivileged(): Promise<void> {
		const server = this.message.channel.guild;
		if (!this.message.member) {
			throw new MiscInternalError(
				`No server member information for ${this.message.author.id} in server ${server.name} (${server.id})`
			);
		}
		if (!(await this.roleProvider.validate(server, this.message.member.roles))) {
			throw new UserError(
				`You must have the ${this.roleProvider.name} role to create a tournament in this server!`
			);
		}
	}

	mentions(): DiscordUserSubset[] {
		return this.message.mentions;
	}
}

export type Command = { name: string; args: string[] };

export default class CommandDispatcher {
	protected readonly prefix: string;
	readonly getChannel: GetChannelDelegate;
	readonly getDMChannel: GetDMChannelDelegate;
	readonly deleteMessage: DeleteMessageDelegate;
	roleProvider: RoleProvider;
	participantController: ParticipantController;
	permissionController: PermissionController;
	roundController: RoundController;
	tournamentController: TournamentController;
	protected readonly actions: { [command: string]: ControllerAction };

	// Java-esque boilerplate may be a problem but this is to follow
	// the dependency inversion principle. If Eris.Client is easily mockable
	// and testable then the delegates are not necessary.
	constructor(
		prefix: string,
		getChannel: GetChannelDelegate,
		getDMChannel: GetDMChannelDelegate,
		deleteMessage: DeleteMessageDelegate,
		roleProvider: RoleProvider,
		participantController: ParticipantController,
		permissionController: PermissionController,
		roundController: RoundController,
		tournamentController: TournamentController
	) {
		this.prefix = prefix;
		this.getChannel = getChannel;
		this.getDMChannel = getDMChannel;
		this.deleteMessage = deleteMessage;
		this.roleProvider = roleProvider;
		this.participantController = participantController;
		this.permissionController = permissionController;
		this.roundController = roundController;
		this.tournamentController = tournamentController;
		// This may be doable by defining a map like this on each controller,
		// which can be populated by method decorators,
		// and then the only responsibility of the dispatcher would be mixing
		// everything in, optionally checking for duplicates or ignoring.
		this.actions = {
			help: tournamentController.help.bind(tournamentController),
			list: tournamentController.list.bind(tournamentController),
			create: tournamentController.create.bind(tournamentController),
			update: tournamentController.update.bind(tournamentController),
			sync: tournamentController.challongeSync.bind(tournamentController),
			open: tournamentController.open.bind(tournamentController),
			pause: tournamentController.pause.bind(tournamentController),
			cancel: tournamentController.cancel.bind(tournamentController),
			delete: tournamentController.delete.bind(tournamentController),
			addpublic: permissionController.addPublicChannel.bind(permissionController),
			removepublic: permissionController.removePublicChannel.bind(permissionController),
			addprivate: permissionController.addPrivateChannel.bind(permissionController),
			removeprivate: permissionController.removePrivateChannel.bind(permissionController),
			addhost: permissionController.addTournamentHost.bind(permissionController),
			removehost: permissionController.removeTournamentHost.bind(permissionController),
			round: roundController.next.bind(roundController),
			start: roundController.start.bind(tournamentController),
			score: roundController.score.bind(roundController),
			players: participantController.list.bind(participantController),
			deck: participantController.getDeck.bind(participantController)
			// drop: participantController.drop.bind(participantController),
		};
	}

	// Can be made a pure function if prefix is a parameter
	parse(command: string): Command | null {
		if (!command.startsWith(this.prefix)) {
			return null;
		}
		command = command.trim();
		const firstSpace = command.indexOf(" ");
		if (firstSpace === -1) {
			return {
				name: command.slice(this.prefix.length).toLowerCase(),
				args: []
			};
		}
		return {
			name: command.slice(this.prefix.length, firstSpace).toLowerCase(),
			args: command
				.slice(firstSpace + 1)
				.split("|")
				.map(s => s.trim())
		};
	}

	// The magic: takes an incoming message in a server channel and
	// executes the according command, catching and handling any exceptions.
	// Should not reject the promise.
	async dispatch(message: Message<TextChannel>): Promise<void> {
		const command = this.parse(message.content);
		if (!command) {
			return;
		}
		if (command.name in this.actions) {
			const discord = new ErisDiscordWrapper(
				message,
				this.roleProvider,
				this.getChannel,
				this.getDMChannel,
				this.deleteMessage
			);
			try {
				await this.actions[command.name](discord, command.args);
			} catch (commandError) {
				if (commandError instanceof UserError) {
					// Instead of the nested try-catch that may be hard to follow,
					// we could add a noThrow argument to sendMessage and log over there.
					try {
						await discord.sendMessage(commandError.message);
					} catch (discordError) {
						logger.error(discordError);
						logger.error(commandError);
					}
				} else {
					logger.error(commandError);
				}
			}
		}
	}
}
