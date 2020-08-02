import Controller, { DiscordWrapper } from "./controller";

export default class PermissionController extends Controller {
	async addPublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
		// avoid multiple addition
		return;
	}

	async removePublicChannel(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challonge ID, channel ID (optional, use current if not provided)
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
