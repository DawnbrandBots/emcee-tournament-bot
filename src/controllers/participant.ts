import Controller, { DiscordWrapper, DiscordSender, DiscordUserSubset, RoleProviderFactory } from "./controller";
import { Message, PrivateChannel, TextChannel, GuildChannel, User, AnyChannel } from "eris";
import logger from "../logger";
import { MiscInternalError, DeckNotFoundError, AssertTextChannelError } from "../errors";
import {
	addPendingParticipant,
	findTournamentByRegisterMessage,
	removePendingParticipant,
	removeConfirmedParticipant,
	confirmParticipant
} from "../actions";
import { TournamentModel } from "../models";
import { DiscordDeck } from "../discordDeck";
import { GetChannelDelegate } from "../discord/dispatch";
import RoleProvider from "../discord/role";
import { Challonge } from "../challonge";

export default class ParticipantController extends Controller {
	protected getRoleProvider: RoleProviderFactory;

	constructor(challonge: Challonge, getRoleProvider: RoleProviderFactory) {
		super(challonge);
		this.getRoleProvider = getRoleProvider;
	}

	@Controller.Arguments("challongeId")
	async list(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		if (tournament.confirmedParticipants.length === 0) {
			await discord.sendMessage("That tournament has no confirmed participants yet!");
			return;
		}
		await discord.sendMessage(tournament.confirmedParticipants.map(p => this.mention(p.discord)).join(", "));
	}

	async addPending(discord: DiscordSender, userId: string): Promise<void> {
		// Ported from old, lots of problems and assumptions
		const messageId = discord.currentMessageId();
		const channelId = discord.currentChannelId();
		if (await addPendingParticipant(messageId, channelId, userId)) {
			const tournament = await findTournamentByRegisterMessage(messageId, channelId);
			if (!tournament) {
				// impossible because of addPendingParticipant except in the case of a race condition
				throw new MiscInternalError(`User ${userId} added to non-existent tournament!`);
			}
			logger.verbose(`User ${userId} registered for tournament ${tournament.challongeId}.`);
			try {
				await discord.sendDirectMessage(
					userId,
					`You have successfully registered for **${tournament.name}**. ` +
						"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
				);
			} catch (e) {
				if (e.code === 50007) {
					// DiscordRESTError - User blocking DMs
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
				if (e.code !== 50007) {
					// DiscordRESTError - User blocking DMs
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
			);
			try {
				await discord.sendDirectMessage(userId, `You have dropped from **${tournament.name}**.`);
			} catch (e) {
				if (e.code !== 50007) {
					// DiscordRESTError - User blocking DMs
					throw e;
				} // No need to notify about blocked DMs if dropping
			}
		}
	}

	protected static async grantRole(
		roleProvider: RoleProvider,
		channel: AnyChannel,
		user: User
	): Promise<void> {
		if (channel instanceof GuildChannel) {
			await roleProvider.grant(channel.guild, user);
		} else {
			logger.error(`While trying to grant role "${roleProvider.name}", found invalid GuildChannel ${channel.id}`);
		}
	}

	// Ported from old
	protected static async sendRegistration(
		channel: AnyChannel,
		tournament: string,
		user: DiscordUserSubset,
		deck: DiscordDeck
	): Promise<void> {
		if (channel instanceof TextChannel) {
			await channel.createMessage(`${user.mention} has signed up for **${tournament}** with the following deck.`);
			await deck.sendProfile(channel, `${user.username}#${user.discriminator}.ydk`);
		} else {
			logger.error(`While sending registration for "${tournament}", found invalid GuildChannel ${channel.id}`);
		}
	}

	// TODO: remove direct Eris dependency after DiscordDeck refactor
	// Ported from old
	async confirmPending(getChannel: GetChannelDelegate, msg: Message<PrivateChannel>): Promise<void> {
		// confirm participant
		const docs = await TournamentModel.find({
			pendingParticipants: msg.author.id
		});
		if (docs.length === 0) {
			try {
				await DiscordDeck.sendProfile(msg, msg.channel);
			} catch (e) {
				// ignore "no deck" message
				if (!(e instanceof DeckNotFoundError)) {
					throw e;
				}
			}
			return;
		}
		if (docs.length > 1) {
			const tournaments = docs.map(t => t.name || t.challongeId).join("\n");
			await msg.channel.createMessage(
				`You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\n${tournaments}`
			);
			return;
		}
		// length === 1
		const doc = docs[0];
		try {
			const deck = await DiscordDeck.constructFromMessage(msg);
			const result = await deck.validate();
			if (result.length > 0) {
				await msg.channel.createMessage(
					"Your deck is not legal, so you have not been registered. Please fix the issues listed below and try submitting again."
				);
				await deck.sendProfile(msg.channel, `${msg.author.username}#${msg.author.discriminator}.ydk`);
				return;
			}
			const challongeUser = await this.challonge.addParticipant(doc.challongeId, {
				name: `${msg.author.username}#${msg.author.discriminator}`,
				misc: msg.author.id
			});
			await confirmParticipant(
				doc.challongeId,
				msg.author.id,
				challongeUser.participant.id,
				[...deck.record.main],
				[...deck.record.extra],
				[...deck.record.side]
			);
			const roleProvider = this.getRoleProvider(doc.challongeId);
			doc.publicChannels.map(id => ParticipantController.grantRole(roleProvider, getChannel(id), msg.author))
			await msg.channel.createMessage(
				`Congratulations! You have been registered in ${doc.name} with the following deck.`
			);
			await deck.sendProfile(msg.channel, `${msg.author.username}#${msg.author.discriminator}.ydk`);
			await Promise.all(
				doc.privateChannels.map(id =>
					ParticipantController.sendRegistration(getChannel(id), doc.name, msg.author, deck)
				)
			);
			logger.verbose(`User ${msg.author.id} confirmed deck for tournament ${doc.challongeId}.`);
		} catch (e) {
			if (e instanceof DeckNotFoundError) {
				await msg.channel.createMessage(e.message);
			} else {
				throw e;
			}
		}
	}

	async getDeck(discord: DiscordWrapper, args: string[]): Promise<void> {
		// challongeId, user Discord ID
		return;
	}
}
