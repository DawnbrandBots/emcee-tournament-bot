import Controller, { DiscordWrapper } from "./controller";
import { UserError } from "../errors";
import { addAnnouncementChannel, removeAnnouncementChannel, addHost, removeHost } from "../actions";
import logger from "../logger";

export default class PermissionController extends Controller {
	@Controller.Arguments("challongeId") // plus optional channelId
	async addPublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		const channelId = args[1] || discord.currentChannelId();
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
		logger.verbose(
			`Tournament ${tournament.id} added public announcement channel ${channelId} by ${
				discord.currentUser().username
			} (${discord.currentUser().id}).`
		);
	}

	@Controller.Arguments("challongeId") // plus optional channelId
	async removePublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		const channelId = args[1] || discord.currentChannelId();
		if (!tournament.publicChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> not registered as a public announcement channel for ${tournament.name}`
			);
		}
		await removeAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "public");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully removed as a public announcement channel for ${tournament.name}`
		);
		logger.verbose(
			`Tournament ${tournament.id} removed public announcement channel ${channelId} by ${
				discord.currentUser().username
			} (${discord.currentUser().id}).`
		);
	}

	@Controller.Arguments("challongeId") // plus optional channelId
	async addPrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		const channelId = args[1] || discord.currentChannelId();
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
		logger.verbose(
			`Tournament ${tournament.id} added private announcement channel ${channelId} by ${
				discord.currentUser().username
			} (${discord.currentUser().id}).`
		);
	}

	@Controller.Arguments("challongeId")
	async removePrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		const channelId = args[1] || discord.currentChannelId();
		if (!tournament.privateChannels.includes(channelId)) {
			throw new UserError(
				`Channel <#${channelId}> not registered as a private announcement channel for ${tournament.name}`
			);
		}
		await removeAnnouncementChannel(channelId, tournament.challongeId, discord.currentUser().id, "private");
		await discord.sendMessage(
			`Channel <#${channelId}> successfully removed as a private announcement channel for ${tournament.name}`
		);
		logger.verbose(
			`Tournament ${tournament.id} removed private announcement channel ${channelId} by ${
				discord.currentUser().username
			} (${discord.currentUser().id}).`
		);
	}

	@Controller.Arguments("challongeId") // plus @mention-user
	async addTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
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
		logger.verbose(
			`Tournament ${tournament.id} added host ${mentionedUser} by ${discord.currentUser().username} (${
				discord.currentUser().id
			}).`
		);
	}

	@Controller.Arguments("challongeId") // plus @mention-user
	async removeTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
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
		logger.verbose(
			`Tournament ${tournament.id} removed host ${mentionedUser} by ${discord.currentUser().username} (${
				discord.currentUser().id
			}).`
		);
	}
}
