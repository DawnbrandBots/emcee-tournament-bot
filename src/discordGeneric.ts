import { UserError } from "./errors";
import logger from "./logger";

export interface DiscordAttachmentIn {
	filename: string;
	url: string;
}

export interface DiscordMessageIn {
	id: string;
	content: string;
	attachments: DiscordAttachmentIn[];
	author: string;
	reply: (msg: DiscordMessageOut) => Promise<void>;
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
	sendMessage(msg: DiscordMessageOut, channel: string): Promise<void>;
	authenticateTO(msg: DiscordMessageIn): Promise<void>;
}

export class DiscordInterface {
	private commands: { [name: string]: DiscordCommand } = {};
	private api: DiscordWrapper;
	private prefix: string;
	constructor(api: DiscordWrapper, prefix: string) {
		this.commands = {};
		this.api = api;
		this.prefix = prefix;
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
				logger.error(e);
			}
		}
	}

	public registerCommand(name: string, func: DiscordCommand): void {
		this.commands[name] = func;
	}

	public async authenticateTO(msg: DiscordMessageIn): Promise<void> {
		return await this.api.authenticateTO(msg);
	}
}
