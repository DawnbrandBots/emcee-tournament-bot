import { Util } from "discord.js";

export interface DiscordAttachmentIn {
	filename: string;
	url: string;
}

export interface DiscordMessageIn {
	id: string;
	content: string;
	attachments: DiscordAttachmentIn[];
	author: string;
	channelId: string;
	serverId: string;
	reply: (msg: DiscordMessageOut, file?: DiscordAttachmentOut) => Promise<void>;
	react: (emoji: string) => Promise<void>;
	edit: (newMsg: DiscordMessageOut) => Promise<void>;
}

export interface DiscordMessageLimited {
	id: string;
	channelId: string;
}

export type DiscordMessageOut = string | DiscordEmbed;

export type DiscordMessageSent = DiscordMessageIn; // same properties, different use

export interface DiscordEmbed {
	title: string;
	fields: DiscordEmbedField[];
}

interface DiscordEmbedField {
	name: string;
	value: string;
}

export interface DiscordAttachmentOut {
	filename: string;
	contents: string;
}

export type DiscordDeleteHandler = (msg: DiscordMessageLimited) => Promise<void> | void;

type DiscordReactionResponse = (msg: DiscordMessageIn, userId: string) => Promise<void> | void;

export interface DiscordReactionHandler {
	msg: string;
	emoji: string;
	response: DiscordReactionResponse;
}

export interface DiscordWrapper {
	onReaction: (handler: DiscordReactionHandler) => void;
	onReactionRemove: (handler: DiscordReactionHandler) => void;
	removeUserReaction: (channelId: string, messageId: string, emoji: string, userId: string) => Promise<boolean>;
	getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn | null>;
	sendMessage(channelId: string, msg: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<DiscordMessageSent>;
	getUsername(userId: string): string;
	getRESTUsername(userId: string): Promise<string | null>;
	sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void>;
}

export class DiscordInterface {
	private api: DiscordWrapper;
	constructor(api: DiscordWrapper) {
		this.api = api;
	}

	public async awaitReaction(
		content: DiscordMessageOut,
		channelId: string,
		emoji: string,
		response: DiscordReactionResponse,
		removeResponse: DiscordReactionResponse
	): Promise<DiscordMessageSent> {
		const msg = await this.sendMessage(channelId, content);
		await msg.react(emoji);
		this.api.onReaction({ msg: msg.id, emoji, response });
		this.api.onReactionRemove({ msg: msg.id, emoji, response: removeResponse });
		return msg;
	}

	public restoreReactionButton(
		msg: DiscordMessageIn,
		emoji: string,
		response: DiscordReactionResponse,
		removeResponse: DiscordReactionResponse
	): void {
		this.api.onReaction({ msg: msg.id, emoji, response });
		this.api.onReactionRemove({ msg: msg.id, emoji, response: removeResponse });
	}

	public async removeUserReaction(
		channelId: string,
		messageId: string,
		emoji: string,
		userId: string
	): Promise<boolean> {
		return await this.api.removeUserReaction(channelId, messageId, emoji, userId);
	}

	public mentionUser(userId: string): string {
		return `<@${userId}>`;
	}

	public async getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn | null> {
		return await this.api.getMessage(channelId, messageId);
	}

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		return await this.api.sendMessage(channelId, msg, file);
	}

	// escape markdown characters if destination is discord, but not if being printed into a file, filename, challonge, etc
	public getUsername(userId: string, escape = false): string {
		const name = this.api.getUsername(userId);
		return escape ? Util.escapeMarkdown(name) : name;
	}

	public async getRESTUsername(userId: string, escape = false): Promise<string | null> {
		const name = await this.api.getRESTUsername(userId);
		return name && escape ? Util.escapeMarkdown(name) : name;
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		await this.api.sendDirectMessage(userId, content);
	}
}
