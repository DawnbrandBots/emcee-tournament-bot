import { Logger } from "winston";
import { UserError } from "../errors";

export interface DiscordAttachmentIn {
	filename: string;
	url: string;
}

export interface DiscordMessageIn {
	id: string;
	content: string;
	attachments: DiscordAttachmentIn[];
	author: string;
	channel: string;
	server: string;
	reply: (msg: DiscordMessageOut, file?: DiscordAttachmentOut) => Promise<void>;
}

export type DiscordMessageOut = string | DiscordEmbed;

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

export type DiscordCommand = (message: DiscordMessageIn, params: string[]) => Promise<void>;

export type DiscordMessageHandler = (msg: DiscordMessageIn) => Promise<void> | void;

export interface DiscordWrapper {
	onMessage: (handler: DiscordMessageHandler) => void;
	onPing: (hander: DiscordMessageHandler) => void;
	sendMessage(msg: DiscordMessageOut, channel: string): Promise<void>;
	authenticateTO(msg: DiscordMessageIn): Promise<void>;
	getMentionedUser(msg: DiscordMessageIn): string;
	getUsername(userId: string): string;
	sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void>;
}

export class DiscordInterface {
	private commands: { [name: string]: DiscordCommand } = {};
	private api: DiscordWrapper;
	private prefix: string;
	private logger: Logger;
	constructor(api: DiscordWrapper, prefix: string, logger: Logger) {
		this.commands = {};
		this.api = api;
		this.prefix = prefix;
		this.logger = logger;
		this.api.onMessage(this.handleMessage);
	}

	private async handleMessage(msg: DiscordMessageIn): Promise<void> {
		if (!msg.content.startsWith(this.prefix)) {
			return;
		}
		const terms = msg.content.split(" ");
		const cmdName = terms[0].slice(this.prefix.length).toLowerCase();
		const args = terms
			.slice(1)
			.join(" ")
			.split("|")
			.map(s => s.trim());
		if (cmdName in this.commands) {
			try {
				await this.commands[cmdName](msg, args);
			} catch (e) {
				if (e instanceof UserError) {
					await msg.reply(e.message);
					return;
				}
				// internal error
				this.logger.error(e);
			}
		}
	}

	public registerCommand(name: string, func: DiscordCommand): void {
		this.commands[name] = func;
	}

	public onPing(func: DiscordMessageHandler): void {
		this.api.onPing(func);
	}

	public async authenticateTO(msg: DiscordMessageIn): Promise<void> {
		return await this.api.authenticateTO(msg);
	}

	public mentionChannel(channelId: string): string {
		return `<#${channelId}>`;
	}

	public mentionUser(userId: string): string {
		return `<@${userId}>`;
	}

	public async sendMessage(msg: DiscordMessageOut, channel: string): Promise<void> {
		await this.api.sendMessage(msg, channel);
	}

	public getMentionedUser(msg: DiscordMessageIn): string {
		return this.api.getMentionedUser(msg);
	}

	public getUsername(userId: string): string {
		return this.api.getUsername(userId);
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		await this.api.sendDirectMessage(userId, content);
	}

	public getChannel(query: string): string | undefined {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(query);
		return channelMatch ? channelMatch[1] : undefined;
	}
}
