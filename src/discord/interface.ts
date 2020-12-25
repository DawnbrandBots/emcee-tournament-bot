import { DatabaseTournament } from "../database/interface";

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

export type DiscordCommand = (message: DiscordMessageIn, params: string[]) => Promise<void>;

export type DiscordMessageHandler = (msg: DiscordMessageIn) => Promise<void> | void;

export type DiscordDeleteHandler = (msg: DiscordMessageLimited) => Promise<void> | void;

type DiscordReactionResponse = (msg: DiscordMessageIn, userId: string) => Promise<void> | void;

export interface DiscordReactionHandler {
	msg: string;
	emoji: string;
	response: DiscordReactionResponse;
}

export interface DiscordWrapper {
	onMessage: (handler: DiscordMessageHandler) => void;
	onDelete: (handler: DiscordDeleteHandler) => void;
	onPing: (hander: DiscordMessageHandler) => void;
	onReaction: (handler: DiscordReactionHandler) => void;
	onReactionRemove: (handler: DiscordReactionHandler) => void;
	removeUserReaction: (channelId: string, messageId: string, emoji: string, userId: string) => Promise<boolean>;
	getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn>;
	sendMessage(channelId: string, msg: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<DiscordMessageSent>;
	deleteMessage(channelId: string, messageId: string): Promise<void>;
	authenticateTO(msg: DiscordMessageIn): Promise<void>;
	getMentionedUser(msg: DiscordMessageIn): string;
	getUsername(userId: string): string;
	getPlayerRole(tournamentId: string, channelId: string): Promise<string>;
	grantPlayerRole(userId: string, roleId: string): Promise<void>;
	removePlayerRole(userId: string, roleId: string): Promise<void>;
	deletePlayerRole(tournamentId: string, channelId: string): Promise<void>;
	sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void>;
}

export class DiscordInterface {
	private api: DiscordWrapper;
	constructor(api: DiscordWrapper) {
		this.api = api;
	}

	public onMessage(func: DiscordMessageHandler): void {
		this.api.onMessage(func);
	}

	public onDelete(func: DiscordDeleteHandler): void {
		this.api.onDelete(func);
	}

	public onPing(func: DiscordMessageHandler): void {
		this.api.onPing(func);
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

	public async removeUserReaction(
		channelId: string,
		messageId: string,
		emoji: string,
		userId: string
	): Promise<boolean> {
		return await this.api.removeUserReaction(channelId, messageId, emoji, userId);
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

	public mentionRole(roleId: string): string {
		return `<@&${roleId}>`;
	}

	public async getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn> {
		return await this.api.getMessage(channelId, messageId);
	}

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		return await this.api.sendMessage(channelId, msg, file);
	}

	public async deleteMessage(channelId: string, messageId: string): Promise<void> {
		await this.api.deleteMessage(channelId, messageId);
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

	public async getPlayerRole(tournament: DatabaseTournament): Promise<string> {
		return await this.api.getPlayerRole(tournament.id, tournament.server);
	}

	public async grantPlayerRole(userId: string, roleId: string): Promise<void> {
		await this.api.grantPlayerRole(userId, roleId);
	}

	public async removePlayerRole(userId: string, roleId: string): Promise<void> {
		await this.api.removePlayerRole(userId, roleId);
	}

	public async deletePlayerRole(tournament: DatabaseTournament): Promise<void> {
		await this.api.deletePlayerRole(tournament.id, tournament.server);
	}

	public getChannel(query: string): string | undefined {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(query);
		return channelMatch ? channelMatch[1] : undefined; // capture group ensured by regex
	}
}

// utility function relevant for Discord message caps
export function splitText(outString: string, cap = 2000): string[] {
	const outStrings: string[] = [];
	while (outString.length > cap) {
		let index = outString.slice(0, cap).lastIndexOf("\n");
		if (index === -1 || index >= cap) {
			index = outString.slice(0, cap).lastIndexOf(".");
			if (index === -1 || index >= cap) {
				index = outString.slice(0, cap).lastIndexOf(" ");
				if (index === -1 || index >= cap) {
					index = cap - 1;
				}
			}
		}
		outStrings.push(outString.slice(0, index + 1));
		outString = outString.slice(index + 1);
	}
	outStrings.push(outString);
	return outStrings;
}
