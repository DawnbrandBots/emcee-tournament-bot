import Controller, { SendMessageFunction } from "./controller";

export default class PermissionController extends Controller {
	async addPublicChannel(
		sendMessage: SendMessageFunction,
		challongeId: string,
		channelId: string
	): Promise<void> {
		return;
	}

	async removePublicChannel(
		sendMessage: SendMessageFunction,
		challongeId: string,
		channelId: string
	): Promise<void> {
		return;
	}
	async addPrivateChannel(
		sendMessage: SendMessageFunction,
		challongeId: string,
		channelId: string
	): Promise<void> {
		return;
	}

	async removePrivateChannel(
		sendMessage: SendMessageFunction,
		challongeId: string,
		channelId: string
	): Promise<void> {
		return;
	}

	async addTournamentHost(
		sendMessage: SendMessageFunction,
		challongeId: string,
		host: string
	): Promise<void> {
		return;
	}

	async removeTournamentHost(
		sendMessage: SendMessageFunction,
		challongeId: string,
		host: string
	): Promise<void> {
		return;
	}
}
