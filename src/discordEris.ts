import { Client, Guild, GuildChannel, Message, MessageContent, Role, TextChannel } from "eris";
import { discordToken } from "./config/env";
import { prefix, toRole } from "./config/config.json";
import {
	DiscordAttachmentOut,
	DiscordInterface,
	DiscordMessageHandler,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordWrapper
} from "./discordGeneric";
import { AssertTextChannelError, UnauthorisedTOError } from "./errors";
import logger from "./logger";
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
	private wrappedMessages: { [id: string]: Message };
	private bot: Client;
	private logger: Logger;
	constructor(logger: Logger) {
		this.logger = logger;
		this.messageHandlers = [];
		this.pingHandlers = [];
		this.wrappedMessages = {};
		this.bot = new Client(discordToken);
		this.bot.on("ready", () => this.logger.info(`Logged in as ${this.bot.user.username} - ${this.bot.user.id}`));
		this.bot.on("messageCreate", this.handleMessage);
		this.bot.connect().catch(this.logger.error);
	}

	async sendMessage(msg: DiscordMessageOut, channel: string): Promise<void> {
		const out = this.unwrapMessageOut(msg);
		const chan = this.bot.getChannel(channel);
		if (chan instanceof TextChannel) {
			await chan.createMessage(out);
			return;
		}
		// otherwise throw?
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
				await msg.channel.createMessage(
					this.unwrapMessageOut(out),
					file ? { file: file.contents, name: file.filename } : undefined
				);
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

	private handleMessage(msg: Message): void {
		const wrappedMsg = this.wrapMessageIn(msg);
		if (msg.mentions.includes(this.bot.user)) {
			for (const handler of this.pingHandlers) {
				handler(wrappedMsg);
			}
			return;
		}
		for (const handler of this.messageHandlers) {
			handler(wrappedMsg);
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

	public onPing(handler: DiscordMessageHandler): void {
		this.pingHandlers.push(handler);
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
}

const eris = new DiscordWrapperEris(logger);
export const discord = new DiscordInterface(eris, prefix, logger);
