import Controller, { DiscordWrapper } from "./controller";
import { UserError } from "../errors";
import { addAnnouncementChannel, removeAnnouncementChannel, addHost, removeHost } from "../actions";

export default class PermissionController extends Controller {
	async addPublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		const tournament = await this.getTournament(discord, args);
		let channelId = args[1];
		if (channelId === undefined) {
			channelId = discord.currentChannelId();
		}
		// avoid multiple addition
		if (tournament.publicChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> is already registered as a public announcement channel for ${tournament.name}`
			);
		}
		await addAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "public");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully registered as a public announcement channel for ${tournament.name}`
		);
	}

	async removePublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		const tournament = await this.getTournament(discord, args);
		let channelId = args[1];
		if (channelId === undefined) {
			channelId = discord.currentChannelId();
		}
		if (!tournament.publicChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> not registered as a public announcement channel for ${tournament.name}`
			);
		}
		await removeAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "public");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully removed as a public announcement channel for ${tournament.name}`
		);
	}

	async addPrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		const tournament = await this.getTournament(discord, args);
		let channelId = args[1];
		if (channelId === undefined) {
			channelId = discord.currentChannelId();
		}
		// avoid multiple addition
		if (tournament.privateChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> is already registered as a private announcement channel for ${tournament.name}`
			);
		}
		await addAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "private");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully registered as a private announcement channel for ${tournament.name}`
		);
	}

	async removePrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		const tournament = await this.getTournament(discord, args);
		let channelId = args[1];
		if (channelId === undefined) {
			channelId = discord.currentChannelId();
		}
		if (!tournament.privateChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> not registered as a private announcement channel for ${tournament.name}`
			);
		}
		await removeAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "private");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully removed as a private announcement channel for ${tournament.name}`
		);
	}

	async addTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, new host Discord ID
		const tournament = await this.getTournament(discord, args);
		const mentionedUser = discord.mentions()[0]?.id;
		if (mentionedUser === undefined) {
			throw new UserError("Must provide an @mention for the user you wish to make a host!");
		}
		// avoid multiple addition
		if (tournament.hosts.includes(mentionedUser)) {
			throw new UserError(`User ${this.mention(mentionedUser)} is already a host for ${tournament.name}!`);
		}
		await addHost(mentionedUser, tournament.challongeId);
		await discord.sendMessage(
			`User ${this.mention(mentionedUser)} successfully added as a host for ${tournament.name}!`
		);
	}

	async removeTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, new host Discord ID
		const tournament = await this.getTournament(discord, args);
		const mentionedUser = discord.mentions()[0]?.id;
		if (mentionedUser === undefined) {
			throw new UserError("Must provide an @mention for the user you wish to remove as host!");
		}
		// prevent multiple addition
		if (!tournament.hosts.includes(mentionedUser)) {
			throw new UserError(`User ${this.mention(mentionedUser)} is not a host for ${tournament.name}!`);
		}
		await removeHost(mentionedUser, tournament.challongeId);
		await discord.sendMessage(
			`User ${this.mention(mentionedUser)} successfully removed as a host for ${tournament.name}!`
		);
	}
}
