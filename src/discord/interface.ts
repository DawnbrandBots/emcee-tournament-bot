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

export interface DiscordWrapper {
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
