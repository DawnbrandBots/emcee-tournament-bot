import {
	Client,
	Emoji,
	Guild,
	GuildChannel,
	Member,
	Message,
	MessageContent,
	MessageFile,
	PossiblyUncachedMessage,
	Role,
	TextChannel
} from "eris";
import { toRole } from "../config/config.json";
import {
	AssertTextChannelError,
	BlockedDMsError,
	MiscInternalError,
	UnauthorisedTOError,
	UserError
} from "../util/errors";
import { getLogger } from "../util/logger";
import {
	DiscordAttachmentOut,
	DiscordDeleteHandler,
	DiscordMessageHandler,
	DiscordMessageIn,
	DiscordMessageLimited,
	DiscordMessageOut,
	DiscordMessageSent,
	DiscordReactionHandler,
	DiscordWrapper
} from "./interface";

const logger = getLogger("eris");

export class DiscordWrapperEris implements DiscordWrapper {
	private messageHandlers: DiscordMessageHandler[];
	private pingHandlers: DiscordMessageHandler[];
	private reactionHandlers: DiscordReactionHandler[];
	private reactionRemoveHandlers: DiscordReactionHandler[];
	private deleteHandlers: DiscordDeleteHandler[];
	private wrappedMessages: { [id: string]: Message };
	private toRoles: { [guild: string]: string };
	private playerRoles: { [tournamentId: string]: string };
	public ready: Promise<void>;

	constructor(private bot: Client) {
		this.messageHandlers = [];
		this.deleteHandlers = [];
		this.pingHandlers = [];
		this.reactionHandlers = [];
		this.reactionRemoveHandlers = [];
		this.wrappedMessages = {};
		this.toRoles = {};
		this.playerRoles = {};
		this.bot.on("warn", (message, shard) => logger.warn(`Shard ${shard}: ${message}`));
		this.bot.on("error", (message, shard) => logger.error(`Shard ${shard}: ${message}`));
		this.bot.on("connect", shard => logger.info(`Shard ${shard} connected to Discord`));
		this.bot.on("disconnect", () => logger.info("Disconnected from Discord"));
		this.bot.on("shardReady", shard => logger.info(`Shard ${shard} ready`));
		this.bot.on("shardDisconnect", shard => logger.info(`Shard ${shard} disconnected`));
		this.bot.on("guildDelete", guild => logger.info(`Guild delete: ${guild}`));
		this.bot.on("messageCreate", this.handleMessage.bind(this));
		this.bot.on("messageReactionAdd", this.handleReaction.bind(this));
		this.bot.on("messageReactionRemove", this.handleReactionRemove.bind(this));
		this.bot.on("messageDelete", this.handleDelete.bind(this));
		this.bot.on("guildCreate", async guild => {
			logger.info(`Guild create: ${guild}`);
			// TODO: Make this more exposed in the main bot files
			// but this whole module system is getting overhauled later anyway
			await this.createTORole(guild);
		});
		this.ready = new Promise(resolve => {
			this.bot.on("ready", () => {
				logger.info(`Logged in as ${this.bot.user.username} - ${this.bot.user.id}`);
				resolve();
			});
		});
		this.bot.connect().catch(logger.error);
		process.once("SIGTERM", () => {
			this.bot.disconnect({ reconnect: false });
		});
	}

	private wrapMessageIn(msg: Message): DiscordMessageIn {
		this.wrappedMessages[msg.id] = msg;
		const channel = msg.channel;
		const guildId = channel instanceof GuildChannel ? channel.guild.id : "private";
		return {
			id: msg.id,
			attachments: msg.attachments,
			content: msg.content,
			author: msg.author.id,
			channelId: channel.id,
			serverId: guildId,
			reply: async (out: DiscordMessageOut, file?: DiscordAttachmentOut): Promise<void> => {
				await msg.channel.createMessage(this.unwrapMessageOut(out), this.unwrapFileOut(file));
			},
			react: async (emoji: string): Promise<void> => {
				await msg.addReaction(emoji);
			},
			edit: async (newMsg: DiscordMessageOut): Promise<void> => {
				await msg.edit(this.unwrapMessageOut(newMsg));
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

	public async getMessage(channelId: string, messageId: string): Promise<DiscordMessageIn | null> {
		try {
			const msg = await this.bot.getMessage(channelId, messageId);
			return this.wrapMessageIn(msg);
		} catch (err) {
			// unknown message
			if (err.code === 10008) {
				return null;
			}
			throw err;
		}
	}

	public async sendMessage(
		channelId: string,
		msg: DiscordMessageOut,
		file?: DiscordAttachmentOut
	): Promise<DiscordMessageSent> {
		const out = this.unwrapMessageOut(msg);
		const outFile = this.unwrapFileOut(file);
		const chan = this.bot.getChannel(channelId);
		if (chan instanceof TextChannel) {
			const response = await chan.createMessage(out, outFile);
			return this.wrapMessageIn(response);
		}
		throw new AssertTextChannelError(channelId);
	}

	public async deleteMessage(channelId: string, messageId: string): Promise<void> {
		await this.bot.deleteMessage(channelId, messageId);
	}

	private async handleMessage(msg: Message): Promise<void> {
		// Ignore messages from all bots and replies
		if (msg.author.bot || msg.messageReference) {
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

	private wrapMessageLimited(msg: PossiblyUncachedMessage): DiscordMessageLimited {
		return {
			channelId: msg.channel.id,
			id: msg.id
		};
	}

	private async handleDelete(msg: PossiblyUncachedMessage): Promise<void> {
		// clean reactions
		this.reactionHandlers = this.reactionHandlers.filter(h => !(h.msg === msg.id));
		for (const handler of this.deleteHandlers) {
			await handler(this.wrapMessageLimited(msg));
		}
	}

	private async handleReaction(msg: PossiblyUncachedMessage, emoji: Emoji, member: Member): Promise<void> {
		if (member.id === this.bot.user.id) {
			return;
		}
		const fullMsg = await this.bot.getMessage(msg.channel.id, msg.id);
		const handlers = this.reactionHandlers.filter(h => h.msg === msg.id && h.emoji === emoji.name);
		for (const handler of handlers) {
			// TODO: move error handling to interface like for messages
			// or just wait until we redo this whole interface/wrapper system
			try {
				await handler.response(this.wrapMessageIn(fullMsg), member.id);
			} catch (e) {
				// no errors arising here should concern the user directly,
				// any procedural issues should be handled by a message, not throwing
				logger.error(e);
			}
		}
	}

	private async handleReactionRemove(msg: PossiblyUncachedMessage, emoji: Emoji, userId: string): Promise<void> {
		if (userId === this.bot.user.id) {
			return;
		}
		const fullMsg = await this.bot.getMessage(msg.channel.id, msg.id);
		const handlers = this.reactionRemoveHandlers.filter(h => h.msg === msg.id && h.emoji === emoji.name);
		for (const handler of handlers) {
			// TODO: move error handling to interface like for messages
			// or just wait until we redo this whole interface/wrapper system
			try {
				await handler.response(this.wrapMessageIn(fullMsg), userId);
			} catch (e) {
				// no errors arising here should concern the user directly,
				// any procedural issues should be handled by a message, not throwing
				logger.error(e);
			}
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
		logger.verbose(`TO role ${newRole.id} created in ${guild.id}.`);
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
		logger.verbose(`Player role ${newRole.id} created in ${guild.id}.`);
		return newRole;
	}

	public async getPlayerRole(tournamentId: string, serverId: string): Promise<string> {
		if (tournamentId in this.playerRoles) {
			return this.playerRoles[tournamentId];
		}
		const guild = this.bot.guilds.get(serverId);
		if (!guild) {
			throw new MiscInternalError(
				`Could not find server ${serverId} as registered with Tournament ${tournamentId}.`
			);
		}
		const role = guild.roles.find(r => r.name === `MC-${tournamentId}-player`);
		if (role) {
			this.playerRoles[tournamentId] = role.id;
			return role.id;
		}
		const newRole = await this.createPlayerRole(guild, tournamentId);

		return newRole.id;
	}

	/**
	 * Retrieve the server member object for the user if the user belongs to the server
	 * that has the the specified role. The user does not have to have the role.
	 *
	 * @param userId Discord user snowflake
	 * @param roleId Query the server by a role snowflake
	 */
	private async getServerMember(userId: string, roleId: string): Promise<Member> {
		const guild = this.bot.guilds.find(g => g.roles.has(roleId));
		if (!guild) {
			throw new MiscInternalError(`Could not find guild with role ${roleId}.`);
		}
		const cachedMember = guild.members.get(userId);
		return cachedMember || (await guild.getRESTMember(userId));
	}

	public async grantPlayerRole(userId: string, roleId: string): Promise<void> {
		const member = await this.getServerMember(userId, roleId);
		await member.addRole(roleId);
	}

	public async removePlayerRole(userId: string, roleId: string): Promise<void> {
		const member = await this.getServerMember(userId, roleId);
		await member.removeRole(roleId);
	}

	public async deletePlayerRole(tournamentId: string, serverId: string): Promise<void> {
		// yes this creates it just to delete it if it doesn't exist
		// but that's better than not deleting it if it exists but isn't cached
		const role = await this.getPlayerRole(tournamentId, serverId);
		const guild = this.bot.guilds.get(serverId);
		if (!guild) {
			throw new MiscInternalError(
				`Could not find server ${serverId} as registered with Tournament ${tournamentId}.`
			);
		}
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

	public async removeUserReaction(
		channelId: string,
		messageId: string,
		emoji: string,
		userId: string
	): Promise<boolean> {
		const msg = await this.bot.getMessage(channelId, messageId);
		try {
			await msg.removeReaction(emoji, userId);
			return true;
		} catch (e) {
			// TODO: check for specific error for message not having the specified reaction/user
			return false;
		}
	}

	public async authenticateTO(m: DiscordMessageIn): Promise<void> {
		const msg = this.wrappedMessages[m.id];
		if (!(msg && msg.channel instanceof GuildChannel)) {
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
		if (msg.mentions.length < 1) {
			throw new UserError(`Message does not mention a user!\n\`${msg.content}\``);
		}
		return msg.mentions[0].id;
	}

	public getUsername(userId: string): string {
		const user = this.bot.users.get(userId);
		return user ? `${user.username}#${user.discriminator}` : userId;
	}

	/**
	 * Retrieves user information by the REST API if not cached.
	 */
	public async getRESTUsername(userId: string): Promise<string | null> {
		try {
			const user = this.bot.users.get(userId) || (await this.bot.getRESTUser(userId));
			return `${user.username}#${user.discriminator}`;
		} catch {
			return null;
		}
	}

	public async sendDirectMessage(userId: string, content: DiscordMessageOut): Promise<void> {
		const user = this.bot.users.get(userId) || (await this.bot.getRESTUser(userId));
		const channel = await user.getDMChannel();
		try {
			await channel.createMessage(this.unwrapMessageOut(content));
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				throw new BlockedDMsError(userId);
			}
			logger.error(e);
		}
	}
}
