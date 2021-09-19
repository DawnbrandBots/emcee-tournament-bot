import { Client, Constants, DiscordAPIError, GuildChannel, Message, MessageAttachment, MessageEmbed } from "discord.js";
import { AssertTextChannelError, BlockedDMsError } from "../util/errors";
import { getLogger } from "../util/logger";
import {
	DiscordAttachmentOut,
	DiscordEmbed,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordWrapper
} from "./interface";

const logger = getLogger("djs");

export class DiscordWrapperDJS implements DiscordWrapper {
	constructor(private bot: Client) {}

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

	private unwrapEmbed(out: DiscordEmbed): MessageEmbed {
		const embed = new MessageEmbed();
		embed.setTitle(out.title);
		embed.setFields(out.fields);
		return embed;
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
			const user = await this.bot.users.fetch(userId);
			return `${user.username}#${user.discriminator}`;
		} catch {
			return null;
		}
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		const user = await this.bot.users.fetch(userId);
		try {
			const messageContent =
				typeof content === "string" ? { content: content } : { embeds: [this.unwrapEmbed(content)] };
			await user.send(messageContent);
			// const messageFile = file ? { files: [new MessageAttachment(file.contents, file.filename)] } : {};
			// await user.send({ ...messageContent, ...messageFile });
		} catch (e) {
			if (e instanceof DiscordAPIError && e.code === Constants.APIErrors.CANNOT_MESSAGE_USER) {
				throw new BlockedDMsError(userId);
			}
			logger.error(e);
		}
	}

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		const messageContent = typeof msg === "string" ? { content: msg } : { embeds: [this.unwrapEmbed(msg)] };
		const messageFile = file ? { files: [new MessageAttachment(file.contents, file.filename)] } : {};
		const chan = await this.bot.channels.fetch(channelId);
		if (chan?.isText()) {
			const response = await chan.send({ ...messageContent, ...messageFile });
			return this.wrapMessageIn(response);
		} else {
			throw new AssertTextChannelError(channelId);
		}
	}
}
