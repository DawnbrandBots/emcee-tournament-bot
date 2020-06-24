import { challonge, ChallongeMatch } from "./challonge";
import { GuildChannel, Message, TextChannel, PrivateChannel } from "eris";
import {
	initTournament,
	isOrganising,
	addAnnouncementChannel,
	removeAnnouncementChannel,
	startTournament,
	removeRegisterMessage,
	confirmParticipant,
	findTournamentByRegisterMessage,
	removePendingParticipant,
	addPendingParticipant,
	nextRound,
	finishTournament,
	addHost,
	removeHost,
	findTournament,
	setTournamentName,
	setTournamentDescription,
	getOngoingTournaments,
	addRegisterMessage,
	getPlayerFromDiscord,
	getPlayerFromId,
	removeConfirmedPariticipant
} from "./actions";
import { bot } from "./bot";
import { TournamentModel, TournamentDoc } from "./models";
import { DiscordDeck } from "./discordDeck";
import { defaultHosts, defaultPublicChannels, defaultPrivateChannels } from "./config/config.json";
import { UnauthorisedHostError, DeckNotFoundError, AssertTextChannelError, UserError } from "./errors";
import logger from "./logger";

const CHECK_EMOJI = "✅";

const tournaments: {
	[id: string]: Tournament;
} = {};

export function getTournament(id: string): Tournament | undefined {
	return tournaments[id];
}

export class Tournament {
	readonly id: string;
	private roles: { [guild: string]: string } = {};
	constructor(id: string) {
		this.id = id;
	}

	public static async init(name: string, description: string, msg: Message): Promise<Tournament> {
		if (!(msg.channel instanceof GuildChannel)) {
			throw new UserError("Tournaments cannot be constructed in Direct Messages!");
		}

		// generate a URL based on the name, with added numbers to prevent conflicts
		const baseUrl = name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
		let candidateUrl = `mc_${baseUrl}`;
		let i = 0;
		while (await TournamentModel.findOne({ challongeId: candidateUrl })) {
			candidateUrl = baseUrl + i;
			i++;
		}

		const tournament = await challonge.createTournament({
			name,
			description,
			// eslint-disable-next-line @typescript-eslint/camelcase
			tournament_type: "swiss",
			url: candidateUrl
		});

		await initTournament(msg.author.id, msg.channel.guild.id, tournament.tournament.url, name, description);

		const tourn = new Tournament(tournament.tournament.url);
		tournaments[tourn.id] = tourn;

		if (defaultHosts && defaultHosts.length > 0) {
			await Promise.all(defaultHosts.map(o => tourn.addHost(msg.author.id, o)));
		}

		if (defaultPublicChannels && defaultPublicChannels.length > 0) {
			await Promise.all(defaultPublicChannels.map(c => tourn.addChannel(c, msg.author.id)));
		}

		if (defaultPrivateChannels && defaultPrivateChannels.length > 0) {
			await Promise.all(defaultPrivateChannels.map(c => tourn.addChannel(c, msg.author.id, true)));
		}

		logger.log({
			level: "verbose",
			message: `New tournament created ${tourn.id} by ${msg.author.id}.`
		});

		return tourn;
	}

	private async getTournament(): Promise<TournamentDoc> {
		return await findTournament(this.id);
	}

	private async verifyHost(host: string): Promise<void> {
		if (!(await isOrganising(host, this.id))) {
			throw new UnauthorisedHostError(host, this.id);
		}
	}

	public async getRole(channelId: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof GuildChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const guild = channel.guild;
		if (guild.id in this.roles) {
			return this.roles[guild.id];
		}
		const name = `MC-Tournament-${this.id}`;
		const role = guild.roles.find(r => r.name === name);
		if (role) {
			this.roles[guild.id] = role.id;
			return role.id;
		}
		const newRole = await guild.createRole(
			{
				name: name,
				color: 0xe67e22
			},
			"Auto-created by Emcee bot."
		);
		this.roles[guild.id] = newRole.id;
		return newRole.id;
	}

	public async addChannel(channelId: string, host: string, isPrivate = false): Promise<string> {
		await this.verifyHost(host);
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const tournament = await this.getTournament();
		const mes = await channel.createMessage(
			`This channel now displaying announcements for ${tournament.name} (${this.id})`
		);
		await addAnnouncementChannel(channelId, this.id, host, isPrivate ? "private" : "public");
		logger.log({
			level: "verbose",
			message: `Channel ${channelId} added to tournament ${this.id} with level ${
				isPrivate ? "private" : "public"
			} by ${host}.`
		});

		return mes.id;
	}

	public async removeChannel(channelId: string, host: string, isPrivate = false): Promise<void> {
		await this.verifyHost(host);
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		if (!(await removeAnnouncementChannel(channelId, this.id, host, isPrivate ? "private" : "public"))) {
			throw new UserError(`Channel ${channel.name} is not a registered announcement channel`);
		}
		const tournament = await this.getTournament();
		await channel.createMessage(`This channel no longer displaying announcements for ${tournament.name}`);
		logger.log({
			level: "verbose",
			message: `Channel ${channelId} removed from tournament ${this.id} with level ${
				isPrivate ? "private" : "public"
			} by ${host}.`
		});
	}

	public async updateTournament(name: string, desc: string, host: string): Promise<[string, string]> {
		await this.verifyHost(host);
		const tournament = await this.getTournament();
		if (!(tournament.status === "preparing")) {
			throw new UserError(`It's too late to update the information for ${tournament.name}.`);
		}
		await challonge.updateTournament(this.id, {
			name,
			description: desc
		});
		const newName = await setTournamentName(this.id, name);
		const newDesc = await await setTournamentDescription(this.id, desc);
		logger.log({
			level: "verbose",
			message: `Tournament ${this.id} updated with name ${newName} and description ${newDesc} by ${host}.`
		});
		return [newName, newDesc];
	}

	private async openRegistrationInChannel(channelId: string, name: string, desc: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const msg = await channel.createMessage(
			`**New Tournament Open: ${name}**\n${desc}\nClick the ${CHECK_EMOJI} below to sign up!`
		);
		await msg.addReaction(CHECK_EMOJI);
		await addRegisterMessage(msg.id, channelId, this.id);
		return msg.id;
	}

	public async openRegistration(host: string): Promise<string[]> {
		await this.verifyHost(host);
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		const messages = await Promise.all(
			channels.map(c => this.openRegistrationInChannel(c, tournament.name, tournament.description))
		);
		logger.log({
			level: "verbose",
			message: `Tournament ${this.id} opened for registration by ${host}.`
		});
		return messages;
	}

	private async warnClosedParticipant(participant: string, name: string): Promise<string> {
		const channel = await bot.getDMChannel(participant);
		const msg = await channel.createMessage(
			`Sorry, the ${name} tournament you registered for has started, and you had not submitted a valid decklist, so you have been dropped.
			If you think this is a mistake, contact the tournament host.`
		);
		return msg.id;
	}

	private async deleteRegisterMessage(ids: { channel: string; message: string }): Promise<void> {
		const message = await bot.getMessage(ids.channel, ids.message);
		await message.delete();
		await removeRegisterMessage(ids.message, ids.channel);
	}

	private async checkBye(): Promise<string | undefined> {
		// odd number of participants means a bye
		const tournament = await this.getTournament();
		if (tournament.confirmedParticipants.length % 2 === 1) {
			const matches = await challonge.indexMatches(this.id, "open");
			const players = tournament.confirmedParticipants.map(p => p.challongeId);
			for (const match of matches) {
				const i = players.indexOf(match.match.player1_id);
				if (i > -1) {
					players.splice(i);
				}
				const j = players.indexOf(match.match.player2_id);
				if (j > -1) {
					players.splice(j);
				}
			}
			if (players.length === 1) {
				const user = await getPlayerFromId(this.id, players[0]);
				return user?.discord;
			}
		}
		return;
	}

	private async startRound(
		channelId: string,
		url: string,
		round: number,
		name: string,
		bye?: string
	): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const role = await this.getRole(channelId);
		let message = `Round ${round} of ${name} has begun! <@&${role}>\nPairings: https://challonge.com/${url}`;
		if (bye) {
			message += `\n<@${bye}> has the bye for this round.`;
		}
		const msg = await channel.createMessage(message);
		return msg.id;
	}

	public async start(host: string): Promise<string[]> {
		await this.verifyHost(host);
		const tournament = await this.getTournament();
		if (tournament.confirmedParticipants.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		await challonge.startTournament(this.id, {});
		const tournData = await challonge.showTournament(this.id);
		const removedIDs = await startTournament(this.id, host, tournData.tournament.swiss_rounds);
		await Promise.all(removedIDs.map(i => this.warnClosedParticipant(i, tournament.name)));
		const messages = tournament.registerMessages;
		await Promise.all(messages.map(this.deleteRegisterMessage));
		const channels = tournament.publicChannels;
		const bye = await this.checkBye();
		const announcements = await Promise.all(
			channels.map(c => this.startRound(c, this.id, 1, tournament.name, bye))
		);
		logger.log({
			level: "verbose",
			message: `Tournament ${this.id} commenced by ${host}.`
		});
		return announcements;
	}

	public async submitScore(
		winnerId: string,
		winnerScore: number,
		loserScore: number,
		host: string
	): Promise<ChallongeMatch> {
		await this.verifyHost(host);
		const doc = await this.getTournament();
		const winner = doc.confirmedParticipants.find(p => p.discord === winnerId);
		if (!winner) {
			throw new UserError(`Could not find a participant for <@${winnerId}>!`);
		}
		const matches = await challonge.indexMatches(this.id, "open", winner.challongeId);
		if (matches.length < 1) {
			throw new UserError(`Could not find an unfinished match for <@${winnerId}>!`);
		}
		const match = matches[0]; // if there's more than one something's gone very wack
		const result = await challonge.updateMatch(this.id, match.match.id.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: winner.challongeId,
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: `${winnerScore}-${loserScore}`
		});
		logger.log({
			level: "verbose",
			message: `Score submitted for tournament ${this.id} by ${host}. ${winnerId} won ${winnerScore}-${loserScore}.`
		});
		return result;
	}

	private async tieMatch(matchId: number): Promise<ChallongeMatch> {
		return await challonge.updateMatch(this.id, matchId.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: "tie",
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: "0-0"
		});
	}

	public async nextRound(host: string): Promise<number> {
		await this.verifyHost(host);
		const matches = await challonge.indexMatches(this.id, "open");
		await Promise.all(matches.map(m => this.tieMatch(m.match.id)));
		const round = await nextRound(this.id, host);
		// if was last round
		if (round === -1) {
			await this.finishTournament(host);
			return -1;
		}
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		const bye = await this.checkBye();
		await Promise.all(channels.map(c => this.startRound(c, this.id, round, tournament.name, bye)));
		logger.log({
			level: "verbose",
			message: `Tournament ${this.id} moved to round ${round} by ${host}.`
		});
		return round;
	}

	private async sendConclusionMessage(channelId: string, url: string, name: string, cancel = false): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const role = await this.getRole(channelId);
		const message = `${name} has ${
			cancel ? "been cancelled." : "concluded!"
		} Thank you all for playing! <@&${role}>\nResults: https://challonge.com/${url}`;
		const msg = await channel.createMessage(message);
		const roleMembers = channel.guild.members.filter(m => m.roles.includes(role));
		await Promise.all(roleMembers.map(m => m.removeRole(role, "Tournament concluded")));
		await msg.channel.guild.deleteRole(role);
		return msg.id;
	}

	public async finishTournament(host: string, cancel = false): Promise<void> {
		await this.verifyHost(host);
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		await Promise.all(channels.map(c => this.sendConclusionMessage(c, this.id, tournament.name, cancel)));
		await challonge.finaliseTournament(this.id, {});
		await finishTournament(this.id, host);
		delete tournaments[this.id];
		logger.log({
			level: "verbose",
			message: `Tournament ${this.id} finished by ${host}.`
		});
	}

	public async addHost(host: string, newHost: string): Promise<boolean> {
		await this.verifyHost(host);
		const result = await addHost(newHost, this.id);
		if (result) {
			logger.log({
				level: "verbose",
				message: `Tournament ${this.id} added new host ${newHost} by ${host}.`
			});
		}
		return result;
	}

	public async removeHost(host: string, toRemove: string): Promise<boolean> {
		await this.verifyHost(host);
		if (host === toRemove) {
			throw new UserError("You cannot remove yourself from organising a tournament!");
		}
		const result = await removeHost(toRemove, this.id);
		if (result) {
			logger.log({
				level: "verbose",
				message: `Tournament ${this.id} removed host ${toRemove} by ${host}.`
			});
		}
		return result;
	}
}

bot.on("messageDelete", msg => {
	removeRegisterMessage(msg.id, msg.channel.id)
		.then(result => {
			if (result) {
				logger.log({
					level: "verbose",
					message: `Registration message ${msg.id} in ${msg.channel.id} deleted.`
				});
			}
		})
		.catch(e => {
			logger.log({
				level: "error",
				message: e.message
			});
		});
});

async function handleDMFailure(channelId: string, userId: string): Promise<string> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof TextChannel)) {
		throw new AssertTextChannelError(channelId);
	}
	const msg = await channel.createMessage(
		`User <@${userId}> is trying to register for the tournament, but does not accept DMs from me! Please ask them to change their settings to allow this.`
	);
	return msg.id;
}

bot.on("messageReactionAdd", async (msg, emoji, userId) => {
	if (userId === bot.user.id) {
		return;
	}
	// register pending participant
	if (emoji.name === CHECK_EMOJI && (await addPendingParticipant(msg.id, msg.channel.id, userId))) {
		const chan = await bot.getDMChannel(userId);
		const tournament = await findTournamentByRegisterMessage(msg.id, msg.channel.id);
		if (!tournament) {
			// impossible because of addPendingParticipant except in the case of a race condition
			logger.log({
				level: "error",
				message: `User ${userId} added to non-existent tournament!`
			});
			return;
		}
		try {
			await chan.createMessage(
				`You have successfully registered for ${tournament.name}. ` +
					"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
			);
			logger.log({
				level: "verbose",
				message: `User ${userId} registered for tournament ${tournament.challongeId}.`
			});
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				await Promise.all(tournament.privateChannels.map(c => handleDMFailure(c, userId)));
				return;
			}
			logger.log({
				level: "error",
				message: e.message
			});
		}
	}
});

async function reportDrop(channelId: string, userId: string, tournament: string): Promise<string> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof TextChannel)) {
		throw new AssertTextChannelError(channelId);
	}
	const msg = await channel.createMessage(`User <@${userId}> has dropped from ${tournament}`);
	return msg.id;
}

bot.on("messageReactionRemove", async (msg, emoji, userId) => {
	if (userId === bot.user.id || emoji.name !== CHECK_EMOJI) {
		return;
	}
	// remove pending participant
	if (await removePendingParticipant(msg.id, msg.channel.id, userId)) {
		const chan = await bot.getDMChannel(userId);
		const tournament = await findTournamentByRegisterMessage(msg.id, msg.channel.id);
		if (!tournament) {
			// impossible because of removePendingParticipant except in the case of a race condition
			logger.log({
				level: "error",
				message: `User ${userId} removed from non-existent tournament!`
			});
			return;
		}
		const user = await getPlayerFromDiscord(tournament.challongeId, userId);
		if (!user) {
			// impossible because of removePendingParticipant except in the case of a race condition
			logger.log({
				level: "error",
				message: `Non-existing user ${userId} removed from tournament ${tournament.challongeId}!`
			});
			return;
		}
		try {
			await chan.createMessage(`You have successfully dropped from ${tournament.name}.`);
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				await Promise.all(tournament.privateChannels.map(c => handleDMFailure(c, userId)));
				return;
			}
			throw e;
		}
	}
	// drop confirmed participant
	if (await removeConfirmedPariticipant(msg.id, msg.channel.id, userId)) {
		const chan = await bot.getDMChannel(userId);
		const tournament = await findTournamentByRegisterMessage(msg.id, msg.channel.id);
		if (!tournament) {
			// impossible because of removeConfirmedgParticipant except in the case of a race condition
			throw new MiscInternalError(`User ${userId} removed from non-existent tournament!`);
		}
		const user = await getPlayerFromDiscord(tournament.challongeId, userId);
		if (!user) {
			// impossible because of removeConfirmedgParticipant except in the case of a race condition
			throw new MiscInternalError(
				`Non-existing user ${userId} removed from tournament ${tournament.challongeId}!`
			);
		}
		try {
			await challonge.removeParticipant(tournament.challongeId, user.challongeId);
			await chan.createMessage(`You have successfully dropped from ${tournament.name}.`);
			await Promise.all(tournament.privateChannels.map(c => reportDrop(c, userId, tournament.name)));
			logger.log({
				level: "verbose",
				message: `User ${userId} dropped from tournament ${tournament.challongeId}.`
			});
		} catch (e) {
			// DiscordRESTError - User blocking DMs
			if (e.code === 50007) {
				await Promise.all(tournament.privateChannels.map(c => handleDMFailure(c, userId)));
				return;
			}
			// nowhere to throw
			logger.log({
				level: "error",
				message: e.message
			});
		}
	}
});

async function grantTournamentRole(channelId: string, user: string, tournamentId: string): Promise<boolean> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof GuildChannel)) {
		throw new AssertTextChannelError(channelId);
	}
	const member = channel.guild.members.get(user);
	if (!member) {
		return false;
	}
	const tournament = tournaments[tournamentId];
	try {
		const role = await tournament.getRole(channelId);
		await member.addRole(role, "Tournament registration");
	} catch (e) {
		logger.log({
			level: "error",
			message: e.message
		});
	}
	return true;
}

async function sendTournamentRegistration(
	channelId: string,
	userId: string,
	deck: DiscordDeck,
	name: string
): Promise<string> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof TextChannel)) {
		throw new AssertTextChannelError(channelId);
	}
	const msg = await channel.createMessage(`<@${userId}> has signed up for ${name} with the following deck.`);
	const user = bot.users.get(userId);
	await deck.sendProfile(channel.id, user ? `${user.username}#${user.discriminator}ydk` : userId);
	return msg.id;
}

export async function confirmDeck(msg: Message): Promise<void> {
	if (msg.channel instanceof PrivateChannel) {
		// confirm participant
		const docs = await TournamentModel.find({
			pendingParticipants: msg.author.id
		});
		if (docs.length === 0) {
			try {
				await DiscordDeck.sendProfile(msg);
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
				await deck.sendProfile(msg.channel.id, `${msg.author.username}#${msg.author.discriminator}.ydk`);
				return;
			}
			const challongeUser = await challonge.addParticipant(doc.challongeId, {
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
			const channels = doc.publicChannels;
			await Promise.all(channels.map(c => grantTournamentRole(c, msg.author.id, doc.challongeId)));
			await msg.channel.createMessage(
				`Congratulations! You have been registered in ${doc.name} with the following deck.`
			);
			await deck.sendProfile(msg.channel.id, `${msg.author.username}#${msg.author.discriminator}.ydk`);
			await Promise.all(
				doc.privateChannels.map(c => sendTournamentRegistration(c, msg.author.id, deck, doc.name))
			);
			logger.log({
				level: "verbose",
				message: `User ${msg.author.id} confirmed deck for tournament ${doc.challongeId}.`
			});
		} catch (e) {
			if (e instanceof DeckNotFoundError) {
				await msg.channel.createMessage(e.message);
			} else {
				// nowhere to throw
				logger.log({
					level: "error",
					message: e.message
				});
			}
		}
	}
}

getOngoingTournaments().then(ts => {
	for (const t of ts) {
		tournaments[t.challongeId] = new Tournament(t.challongeId);
	}
	logger.log({
		level: "info",
		message: "Loaded persistent tournaments!"
	});
});
