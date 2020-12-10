import {
	Client,
	Emoji,
	Guild,
	GuildChannel,
	Message,
	MessageContent,
	MessageFile,
	PossiblyUncachedMessage,
	Role,
	TextChannel
} from "eris";
import { discordToken } from "../config/env";
import { prefix, toRole } from "../config/config.json";
import {
	DiscordAttachmentOut,
	DiscordDeleteHandler,
	DiscordInterface,
	DiscordMessageHandler,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordReactionHandler,
	DiscordWrapper
} from ".";
import { AssertTextChannelError, BlockedDMsError, UnauthorisedTOError, UserError } from "../errors";
import logger from "../logger";
import { Logger } from "winston";

const toRoles: { [guild: string]: string } = {};

// from commands/channels.ts. should be used somewhere but unsure immediately how to adapt
/*
function getChannel(msg: Message, mention?: string): TextChannel {
	if (mention) {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(mention);
		if (channelMatch !== null) {
			const channelCandidate = bot.getChannel(channelMatch[1]);
			if (channelCandidate && channelCandidate instanceof TextChannel) {
				return channelCandidate;
			}
		}
	}

	if (!(msg.channel instanceof TextChannel)) {
		throw new AssertTextChannelError(msg.channel.id);
	}
	return msg.channel;
}
*/

export class DiscordWrapperEris implements DiscordWrapper {
	private messageHandlers: DiscordMessageHandler[];
	private pingHandlers: DiscordMessageHandler[];
	private reactionHandlers: DiscordReactionHandler[];
	private deleteHandlers: DiscordDeleteHandler[];
	private wrappedMessages: { [id: string]: Message };
	private bot: Client;
	private logger: Logger;
	constructor(logger: Logger) {
		this.logger = logger;
		this.messageHandlers = [];
		this.deleteHandlers = [];
		this.pingHandlers = [];
		this.reactionHandlers = [];
		this.wrappedMessages = {};
		this.bot = new Client(discordToken);
		this.bot.on("ready", () => this.logger.info(`Logged in as ${this.bot.user.username} - ${this.bot.user.id}`));
		this.bot.on("messageCreate", this.handleMessage);
		this.bot.on("messageReactionAdd", this.handleReaction);
		this.bot.on("messageDelete", this.handleDelete);
		this.bot.connect().catch(this.logger.error);
	}

	async sendMessage(
		channel: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		const out = this.unwrapMessageOut(msg);
		const outFile = this.unwrapFileOut(file);
		const chan = this.bot.getChannel(channel);
		if (chan instanceof TextChannel) {
			const response = await chan.createMessage(out, outFile);
			return this.wrapMessageIn(response);
		}
		throw new AssertTextChannelError(channel);
	}

	private wrapMessageIn(msg: Message): DiscordMessageIn {
		this.wrappedMessages[msg.id] = msg;
		const channel = msg.channel;
		if (!(channel instanceof GuildChannel)) {
			throw new AssertTextChannelError(channel.id);
		}
		return {
			id: msg.id,
			attachments: msg.attachments,
			content: msg.content,
			author: msg.author.id,
			channel: channel.id,
			server: channel.guild.id,
			reply: async (out: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<void> => {
				await msg.channel.createMessage(this.unwrapMessageOut(out), this.unwrapFileOut(file));
			}
		};
	}

	private unwrapMessageOut(msg: DiscordMessageOut): MessageContent {
		if (typeof msg === "string") {
			return msg;
		}
		// else embed
		return { embed: msg };
	}

	private unwrapFileOut(file?: DiscordAttachmentOut): MessageFile | undefined {
		return file ? { file: file.contents, name: file.filename } : undefined;
	}

	private async handleMessage(msg: Message): Promise<void> {
		if (msg.author.bot) {
			return;
		}
		const wrappedMsg = this.wrapMessageIn(msg);
		if (msg.mentions.includes(this.bot.user)) {
			for (const handler of this.pingHandlers) {
				await handler(wrappedMsg);
			}
			return;
		}
		for (const handler of this.messageHandlers) {
			await handler(wrappedMsg);
		}
	}

	private async handleDelete(msg: PossiblyUncachedMessage): Promise<void> {
		// clean reactions
		this.reactionHandlers = this.reactionHandlers.filter(h => !(h.msg === msg.id));
		const fullMsg = await this.bot.getMessage(msg.channel.id, msg.id);
		for (const handler of this.deleteHandlers) {
			await handler(this.wrapMessageIn(fullMsg));
		}
	}

	private async handleReaction(msg: PossiblyUncachedMessage, emoji: Emoji, userId: string): Promise<void> {
		if (userId === this.bot.user.id) {
			return;
		}
		const fullMsg = await this.bot.getMessage(msg.channel.id, msg.id);
		const handlers = this.reactionHandlers.filter(h => h.msg === msg.id && h.emoji === emoji.name);
		for (const handler of handlers) {
			await handler.response(this.wrapMessageIn(fullMsg), userId);
		}
	}

	private async createTORole(guild: Guild): Promise<Role> {
		const newRole = await guild.createRole(
			{
				name: toRole,
				color: 0x3498db
			},
			"Auto-created by Emcee bot."
		);
		toRoles[guild.id] = newRole.id;
		this.logger.verbose(`TO role ${newRole.id} re-created in ${guild.id}.`);
		return newRole;
	}

	private async getTORole(guild: Guild): Promise<string> {
		if (guild.id in toRoles) {
			return toRoles[guild.id];
		}
		const role = guild.roles.find(r => r.name === toRole);
		if (role) {
			toRoles[guild.id] = role.id;
			return role.id;
		}
		const newRole = await this.createTORole(guild);
		return newRole.id;
	}

	public onMessage(handler: DiscordMessageHandler): void {
		this.messageHandlers.push(handler);
	}

	public onDelete(handler: DiscordDeleteHandler): void {
		this.deleteHandlers.push(handler);
	}

	public onPing(handler: DiscordMessageHandler): void {
		this.pingHandlers.push(handler);
	}

	public onReaction(handler: DiscordReactionHandler): void {
		this.reactionHandlers.push(handler);
	}

	public async authenticateTO(m: DiscordMessageIn): Promise<void> {
		const msg = this.wrappedMessages[m.id];
		if (!(msg.channel instanceof GuildChannel)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		const guild = msg.channel.guild;
		const member = guild.members.get(msg.author.id);
		if (!member) {
			throw new UnauthorisedTOError(msg.author.id);
		}
		const role = await this.getTORole(guild);
		if (!member.roles.includes(role)) {
			throw new UnauthorisedTOError(msg.author.id);
		}
	}

	public getMentionedUser(m: DiscordMessageIn): string {
		const msg = this.wrappedMessages[m.id];
		return msg.mentions[0].id;
	}

	public getUsername(userId: string): string {
		const user = this.bot.users.get(userId);
		return user ? `${user.username}#${user.discriminator}` : userId;
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		const user = this.bot.users.get(userId);
		if (!user) {
			// user error means error by the bot user, not error related to the discord user
			throw new UserError(`Cannot find user ${userId} to direct message!`);
		}
		const channel = await user.getDMChannel();
		try {
			await channel.createMessage(this.unwrapMessageOut(content));
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				throw new BlockedDMsError(userId);
			}
			this.logger.error(e);
		}
	}
}

const eris = new DiscordWrapperEris(logger);
export const discord = new DiscordInterface(eris, prefix, logger);
