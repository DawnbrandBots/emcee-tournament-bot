import Controller, { DiscordWrapper } from "./controller";
import { UserError } from "../errors";
import { addAnnouncementChannel, removeAnnouncementChannel } from "../actions";

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
		discord.sendMessage(
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
		discord.sendMessage(
			`Channel <#${channelId}> successfully removed as a public announcement channel for ${tournament.name}`
		);
		return;
	}
	async addPrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		// avoid multiple addition
		return;
	}

	async removePrivateChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		return;
	}

	async addTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, new host Discord ID
		return;
	}

	async removeTournamentHost(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, new host Discord ID
		return;
	}
}
