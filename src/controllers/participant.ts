import Controller, { DiscordWrapper, DiscordSender } from "./controller";
import { Message } from "eris";
import logger from "../logger";
import { MiscInternalError } from "../errors";
import { addPendingParticipant, findTournamentByRegisterMessage, removePendingParticipant, removeConfirmedParticipant } from "../actions";

export default class ParticipantController extends Controller {
	async list(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId
		return;
	}

	protected async sendChannels(
		discord: DiscordSender,
		channels: string[],
		message: string
	): Promise<void> {
		await Promise.all(
			channels.map(channelId => discord.sendChannelMessage(channelId, message))
		);
	}

	async addPending(discord: DiscordSender, userId: string): Promise<void> {
		// Ported from old, lots of problems and assumptions
		const messageId = discord.currentMessageId();
		const channelId = discord.currentChannelId();
		if (await addPendingParticipant(messageId, channelId, userId)) {
			const tournament = await findTournamentByRegisterMessage(messageId, channelId);
			if (!tournament) {
				// impossible because of addPendingParticipant except in the case of a race condition
				throw new MiscInternalError(`User ${userId} added to non-existent tournament!`)
			}
			logger.verbose(`User ${userId} registered for tournament ${tournament.challongeId}.`);
			try {
				await discord.sendDirectMessage(
					userId,
					`You have successfully registered for **${tournament.name}**. ` +
					"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
				);
			} catch (e) {
				if (e.code === 50007) { // DiscordRESTError - User blocking DMs
					this.sendChannels(
						discord,
						tournament.privateChannels,
						`User <@${userId}> is trying to register for **${tournament.name}**, but does not accept DMs from me! Please ask them to change their settings to allow this.`
					);
				} else {
					throw e;
				}
			}
		}
	}

	// TBD
	async confirmPending(
		message: Message // TODO: remove direct Eris dependency after DiscordDeck refactor
	): Promise<void> {
		return;
	}

	async getDeck(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, user Discord ID
		return;
	}

	// Can be invoked by a force drop command and "messageReactionRemove"
	// The original had two separate code paths and we should unify them
	async drop(discord: DiscordSender, userId: string): Promise<void> {
		// Ported from old, lots of problems and assumptions
		const messageId = discord.currentMessageId();
		const channelId = discord.currentChannelId();
		// remove pending participant
		if (await removePendingParticipant(messageId, channelId, userId)) {
			const tournament = await findTournamentByRegisterMessage(messageId, channelId);
			if (!tournament) {
				// impossible because of removePendingParticipant except in the case of a race condition
				throw new MiscInternalError(`User ${userId} removed from non-existent tournament!`);
			}
			try {
				await discord.sendDirectMessage(userId, `You have dropped from **${tournament.name}**.`);
			} catch (e) {
				if (e.code !== 50007) { // DiscordRESTError - User blocking DMs
					throw e;
				} // No need to notify about blocked DMs if dropping
			}
		}
		// drop confirmed participant
		const user = await removeConfirmedParticipant(messageId, channelId, userId);
		if (user) {
			const tournament = await findTournamentByRegisterMessage(messageId, channelId);
			if (!tournament) {
				// impossible because of removeConfirmedParticipant except in the case of a race condition
				throw new MiscInternalError(`User ${userId} removed from non-existent tournament!`);
			}
			logger.verbose(`User ${userId} dropped from tournament ${tournament.challongeId} (internal).`);
			await this.challonge.removeParticipant(tournament.challongeId, user.challongeId);
			logger.verbose(`User ${userId} dropped from tournament ${tournament.challongeId} (challonge).`);
			await this.sendChannels(
				discord,
				tournament.privateChannels,
				`User <@${userId}> has dropped from **${tournament.name}**`
			)
			try {
				await discord.sendDirectMessage(userId, `You have dropped from **${tournament.name}**.`);
			} catch (e) {
				if (e.code !== 50007) { // DiscordRESTError - User blocking DMs
					throw e;
				} // No need to notify about blocked DMs if dropping
			}
		}
	}
}
