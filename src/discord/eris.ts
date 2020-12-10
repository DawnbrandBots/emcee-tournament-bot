import {
	Client,
	Emoji,
	Guild,
	GuildChannel,
	Message,
	MessageContent,
	MessageFile,
	PossiblyUncachedMessage,
	PrivateChannel,
	Role,
	TextChannel
} from "eris";
import { discordToken } from "../config/env";
import { toRole } from "../config/config.json";
import {
	DiscordAttachmentOut,
	DiscordDeleteHandler,
	DiscordMessageHandler,
	DiscordMessageIn,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordReactionHandler,
	DiscordWrapper
} from "./interface";
import { AssertTextChannelError, BlockedDMsError, MiscInternalError, UnauthorisedTOError, UserError } from "../errors";
import { Logger } from "winston";

export class DiscordWrapperEris implements DiscordWrapper {
	private messageHandlers: DiscordMessageHandler[];
	private pingHandlers: DiscordMessageHandler[];
	private reactionHandlers: DiscordReactionHandler[];
	private reactionRemoveHandlers: DiscordReactionHandler[];
	private deleteHandlers: DiscordDeleteHandler[];
	private wrappedMessages: { [id: string]: Message };
	private toRoles: { [guild: string]: string };
	private playerRoles: { [tournamentId: string]: string };
	private bot: Client;
	private logger: Logger;
	constructor(logger: Logger) {
		this.logger = logger;
		this.messageHandlers = [];
		this.deleteHandlers = [];
		this.pingHandlers = [];
		this.reactionHandlers = [];
		this.reactionRemoveHandlers = [];
		this.wrappedMessages = {};
		this.toRoles = {};
		this.playerRoles = {};
		this.bot = new Client(discordToken);
		this.bot.on("ready", () => this.logger.info(`Logged in as ${this.bot.user.username} - ${this.bot.user.id}`));
		this.bot.on("messageCreate", this.handleMessage);
		this.bot.on("messageReactionAdd", this.handleReaction);
		this.bot.on("messageReactionRemove", this.handleReactionRemove);
		this.bot.on("messageDelete", this.handleDelete);
		this.bot.connect().catch(this.logger.error);
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
			isDM: msg.channel instanceof PrivateChannel,
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

	public async sendMessage(
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

	public async deleteMessage(channelId: string, messageId: string): Promise<void> {
		await this.bot.deleteMessage(channelId, messageId);
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

	private async handleReactionRemove(msg: PossiblyUncachedMessage, emoji: Emoji, userId: string): Promise<void> {
		if (userId === this.bot.user.id) {
			return;
		}
		const fullMsg = await this.bot.getMessage(msg.channel.id, msg.id);
		const handlers = this.reactionRemoveHandlers.filter(h => h.msg === msg.id && h.emoji === emoji.name);
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
		this.toRoles[guild.id] = newRole.id;
		this.logger.verbose(`TO role ${newRole.id} re-created in ${guild.id}.`);
		return newRole;
	}

	private async getTORole(guild: Guild): Promise<string> {
		if (guild.id in this.toRoles) {
			return this.toRoles[guild.id];
		}
		const role = guild.roles.find(r => r.name === toRole);
		if (role) {
			this.toRoles[guild.id] = role.id;
			return role.id;
		}
		const newRole = await this.createTORole(guild);
		return newRole.id;
	}

	private async createPlayerRole(guild: Guild, tournamentId: string): Promise<Role> {
		const newRole = await guild.createRole(
			{
				name: `MC-${tournamentId}-player`,
				color: 0xe67e22
			},
			"Auto-created by Emcee bot."
		);
		this.toRoles[guild.id] = newRole.id;
		this.logger.verbose(`Player role ${newRole.id} created in ${guild.id}.`);
		return newRole;
	}

	public async getPlayerRole(tournamentId: string, channel: string): Promise<string> {
		if (tournamentId in this.playerRoles) {
			return this.playerRoles[tournamentId];
		}
		const chan = this.bot.getChannel(channel);
		if (!(chan instanceof GuildChannel)) {
			throw new AssertTextChannelError(channel);
		}
		const guild = chan.guild;
		const role = guild.roles.find(r => r.name === `MC-${tournamentId}-player`);
		if (role) {
			this.playerRoles[tournamentId] = role.id;
			return role.id;
		}
		const newRole = await this.createPlayerRole(guild, tournamentId);

		return newRole.id;
	}

	public async grantPlayerRole(userId: string, channelId: string, roleId: string): Promise<void> {
		const chan = this.bot.getChannel(channelId);
		if (!(chan instanceof GuildChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const guild = chan.guild;
		const member = guild.members.get(userId);
		if (!member) {
			throw new MiscInternalError(`Could not find Member for user ${userId} in channel ${channelId}.`);
		}
		await member.addRole(roleId);
	}

	public async deletePlayerRole(tournamentId: string, channelId: string): Promise<void> {
		// yes this creates it just to delete it if it doesn't exist
		// but that's better than not deleting it if it exists but isn't cached
		const role = await this.getPlayerRole(tournamentId, channelId);
		const chan = this.bot.getChannel(channelId);
		if (!(chan instanceof GuildChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const guild = chan.guild;
		await guild.deleteRole(role);
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

	public onReactionRemove(handler: DiscordReactionHandler): void {
		this.reactionRemoveHandlers.push(handler);
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
