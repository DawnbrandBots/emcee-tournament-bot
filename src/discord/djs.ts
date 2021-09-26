import { Client, GuildChannel, Message, MessageAttachment, MessageEmbed } from "discord.js";
import { AssertTextChannelError } from "../util/errors";
import {
	DiscordAttachmentOut,
	DiscordEmbed,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordWrapper
} from "./interface";

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
