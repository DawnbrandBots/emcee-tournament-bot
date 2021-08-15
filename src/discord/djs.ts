import {
	Client,
	Emoji,
	Message,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	PartialMessage,
	User,
	GuildChannel,
	MessageAttachment,
	MessageEmbed,
	TextChannel
} from "discord.js";
import { AssertTextChannelError, BlockedDMsError } from "../util/errors";
import { getLogger } from "../util/logger";
import {
	DiscordAttachmentOut,
	DiscordDeleteHandler,
	DiscordEmbed,
	DiscordMessageIn,
	DiscordMessageLimited,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordReactionHandler,
	DiscordWrapper
} from "./interface";

const logger = getLogger("djs");

export class DiscordWrapperDJS implements DiscordWrapper {
	private reactionHandlers: DiscordReactionHandler[];
	private reactionRemoveHandlers: DiscordReactionHandler[];
	private deleteHandlers: DiscordDeleteHandler[];

	constructor(private bot: Client) {
		this.deleteHandlers = [];
		this.reactionHandlers = [];
		this.reactionRemoveHandlers = [];
		this.bot.on("messageReactionAdd", this.handleReaction.bind(this));
		this.bot.on("messageReactionRemove", this.handleReactionRemove.bind(this));
		this.bot.on("messageDelete", this.handleDelete.bind(this));
	}

	private async handleDelete(msg: Message | PartialMessage): Promise<void> {
		// clean reactions
		this.reactionHandlers = this.reactionHandlers.filter(h => !(h.msg === msg.id));
		for (const handler of this.deleteHandlers) {
			await handler(this.wrapMessageLimited(msg));
		}
	}

	private async handleReaction(
		reaction: MessageReaction | PartialMessageReaction,
		user: User | PartialUser
	): Promise<void> {
		// TODO: handle null user
		if (user.id === this.bot.user!.id) {
			return;
		}
		const msg = reaction.message;
		const handlers = this.reactionHandlers.filter(h => h.msg === msg.id && h.emoji === reaction.emoji.name);
		for (const handler of handlers) {
			// TODO: move error handling to interface like for messages
			// or just wait until we redo this whole interface/wrapper system
			try {
				const fullMsg: Message = !msg.partial ? msg : await msg.fetch();
				await handler.response(this.wrapMessageIn(fullMsg), user.id);
			} catch (e) {
				// no errors arising here should concern the user directly,
				// any procedural issues should be handled by a message, not throwing
				logger.error(e);
			}
		}
	}

	private async handleReactionRemove(
		reaction: MessageReaction | PartialMessageReaction,
		user: User | PartialUser
	): Promise<void> {
		// TODO: handle null user
		if (user.id === this.bot.user!.id) {
			return;
		}
		const msg = reaction.message;
		const handlers = this.reactionRemoveHandlers.filter(h => h.msg === msg.id && h.emoji === reaction.emoji.name);
		for (const handler of handlers) {
			// TODO: move error handling to interface like for messages
			// or just wait until we redo this whole interface/wrapper system
			try {
				const fullMsg: Message = !msg.partial ? msg : await msg.fetch();
				await handler.response(this.wrapMessageIn(fullMsg), user.id);
			} catch (e) {
				// no errors arising here should concern the user directly,
				// any procedural issues should be handled by a message, not throwing
				logger.error(e);
			}
		}
	}

	private wrapMessageIn(msg: Message): DiscordMessageIn {
		const channel = msg.channel;
		const guildId = channel instanceof GuildChannel ? channel.guild.id : "private";
		return {
			id: msg.id,
			attachments: msg.attachments.map(f => {
				// TODO: handle null name
				return { filename: f.name!, url: f.url };
			}),
			content: msg.content,
			author: msg.author.id,
			channelId: channel.id,
			serverId: guildId,
			reply: async (out: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<void> => {
				const messageContent = typeof out === "string" ? { content: out } : { embeds: [this.unwrapEmbed(out)] };
				const messageFile = file ? { files: [new MessageAttachment(file.contents, file.filename)] } : {};
				await msg.channel.send({ ...messageContent, ...messageFile });
			},
			react: async (emoji: string): Promise<void> => {
				await msg.react(emoji);
			},
			edit: async (newMsg: DiscordMessageOut): Promise<void> => {
				const messageContent =
					typeof newMsg === "string" ? { content: newMsg } : { embeds: [this.unwrapEmbed(newMsg)] };
				await msg.edit(messageContent);
			}
		};
	}

	private wrapMessageLimited(msg: Message | PartialMessage): DiscordMessageLimited {
		return {
			channelId: msg.channel.id,
			id: msg.id
		};
	}

	private unwrapEmbed(out: DiscordEmbed): MessageEmbed {
		const embed = new MessageEmbed();
		embed.setTitle(out.title);
		embed.setFields(out.fields);
		return embed;
	}

	public onDelete(handler: DiscordDeleteHandler): void {
		this.deleteHandlers.push(handler);
	}

	public onReaction(handler: DiscordReactionHandler): void {
		this.reactionHandlers.push(handler);
	}

	public onReactionRemove(handler: DiscordReactionHandler): void {
		this.reactionRemoveHandlers.push(handler);
	}

	public async removeUserReaction(
		channelId: string,
		messageId: string,
		emoji: string,
		userId: string
	): Promise<boolean> {
		// TODO: Check channel exists and is of text type
		const channel = (this.bot.channels.cache.get(channelId) ||
			(await this.bot.channels.fetch(channelId))) as TextChannel;
		const msg = channel.messages.cache.get(messageId) || (await channel.messages.fetch(messageId));
		try {
			// TODO: handle null reaction
			await msg.reactions.cache.get(emoji)?.users.remove(userId);
			return true;
		} catch (e) {
			// TODO: check for specific error for message not having the specified reaction/user
			return false;
		}
	}

	public getUsername(userId: string): string {
		const user = this.bot.users.cache.get(userId);
		return user ? `${user.username}#${user.discriminator}` : userId;
	}

	/**
	 * Retrieves user information by the REST API if not cached.
	 */
	public async getRESTUsername(userId: string): Promise<string | null> {
		try {
			const user = this.bot.users.cache.get(userId) || (await this.bot.users.fetch(userId));
			return `${user.username}#${user.discriminator}`;
		} catch {
			return null;
		}
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		const user = this.bot.users.cache.get(userId) || (await this.bot.users.fetch(userId));
		try {
			const messageContent =
				typeof content === "string" ? { content: content } : { embeds: [this.unwrapEmbed(content)] };
			await user.send(messageContent);
			// const messageFile = file ? { files: [new MessageAttachment(file.contents, file.filename)] } : {};
			// await user.send({ ...messageContent, ...messageFile });
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				throw new BlockedDMsError(userId);
			}
			logger.error(e);
		}
	}

	public async getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn | null> {
		const chan = this.bot.channels.cache.get(channelId) || (await this.bot.channels.fetch(channelId));
		if (chan instanceof TextChannel) {
			const msg = chan.messages.cache.get(messageId) || (await chan.messages.fetch(messageId));
			try {
				await msg?.delete();
			} catch (err) {
				// unknown message
				if (err.code === 10008) {
					return null;
				}
				throw err;
			}
		}
		// TODO: handle null channel
		throw new AssertTextChannelError(channelId);
	}

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		const messageContent = typeof msg === "string" ? { content: msg } : { embeds: [this.unwrapEmbed(msg)] };
		const messageFile = file ? { files: [new MessageAttachment(file.contents, file.filename)] } : {};
		const chan = this.bot.channels.cache.get(channelId) || (await this.bot.channels.fetch(channelId));
		if (chan instanceof TextChannel) {
			const response = await chan.send({ ...messageContent, ...messageFile });
			return this.wrapMessageIn(response);
		}
		throw new AssertTextChannelError(channelId);
	}

	public async deleteMessage(channelId: string, messageId: string): Promise<void> {
		const chan = this.bot.channels.cache.get(channelId) || (await this.bot.channels.fetch(channelId));
		if (chan instanceof TextChannel) {
			const message = chan.messages.cache.get(messageId) || (await chan.messages.fetch(messageId));
			await message.delete();
		}
		throw new AssertTextChannelError(channelId);
	}
}