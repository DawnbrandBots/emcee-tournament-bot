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
	addOrganiser,
	removeOrganiser,
	findTournament,
	UnauthorisedOrganiserError,
	setTournamentName,
	setTournamentDescription,
	getOngoingTournaments,
	addRegisterMessage
} from "./actions";
import { bot } from "./bot";
import { TournamentModel, TournamentDoc } from "./models";
import { DiscordDeck, DeckNotFoundError } from "./discordDeck";
import { defaultOrganisers, defaultPublicChannels, defaultPrivateChannels } from "./config/config.json";

const CHECK_EMOJI = "✅";

const tournaments: {
	[id: string]: Tournament;
} = {};

export function getTournament(id: string): Tournament | undefined {
	return tournaments[id];
}

export class AssertTextChannelError extends Error {
	channelId: string;

	constructor(channelId: string) {
		super(`Channel ${channelId} is not a valid text channel`);
		this.channelId = channelId;
	}
}

export class MiscUserError extends Error {}
export class MiscInternalError extends Error {}

export class Tournament {
	readonly id: string;
	private roles: { [guild: string]: string } = {};
	constructor(id: string) {
		this.id = id;
	}

	public static async init(name: string, description: string, msg: Message): Promise<Tournament> {
		if (!(msg.channel instanceof GuildChannel)) {
			throw new MiscUserError("Tournaments cannot be constructed in Direct Messages!");
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

		if (defaultOrganisers && defaultOrganisers.length > 0) {
			await Promise.all(defaultOrganisers.map(o => tourn.addOrganiser(msg.author.id, o)));
		}

		if (defaultPublicChannels && defaultPublicChannels.length > 0) {
			await Promise.all(defaultPublicChannels.map(c => tourn.addChannel(c, msg.author.id)));
		}

		if (defaultPrivateChannels && defaultPrivateChannels.length > 0) {
			await Promise.all(defaultPrivateChannels.map(c => tourn.addChannel(c, msg.author.id, true)));
		}

		return tourn;
	}

	private async getTournament(): Promise<TournamentDoc> {
		return await findTournament(this.id);
	}

	private async verifyOrganiser(organiser: string): Promise<void> {
		if (!(await isOrganising(organiser, this.id))) {
			throw new UnauthorisedOrganiserError(organiser, this.id);
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

	public async addChannel(channelId: string, organiser: string, isPrivate = false): Promise<string> {
		await this.verifyOrganiser(organiser);
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const tournament = await this.getTournament();
		const mes = await channel.createMessage(
			`This channel now displaying announcements for ${tournament.name} (${this.id})`
		);
		await addAnnouncementChannel(channelId, this.id, organiser, isPrivate ? "private" : "public");
		return mes.id;
	}

	public async removeChannel(channelId: string, organiser: string, isPrivate = false): Promise<void> {
		await this.verifyOrganiser(organiser);
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		if (!(await removeAnnouncementChannel(channelId, this.id, organiser, isPrivate ? "private" : "public"))) {
			throw new MiscUserError(`Channel ${channel.name} is not a registered announcement channel`);
		}
		const tournament = await this.getTournament();
		await channel.createMessage(`This channel no longer displaying announcements for ${tournament.name}`);
	}

	public async updateTournament(name: string, desc: string, organiser: string): Promise<[string, string]> {
		await this.verifyOrganiser(organiser);
		const tournament = await this.getTournament();
		if (!(tournament.status === "preparing")) {
			throw new MiscUserError(`It's too late to update the information for ${tournament.name}.`);
		}
		await challonge.updateTournament(this.id, {
			name,
			description: desc
		});
		const newName = await setTournamentName(this.id, name);
		return [newName, await setTournamentDescription(this.id, desc)];
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

	public async openRegistration(organiser: string): Promise<string[]> {
		await this.verifyOrganiser(organiser);
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		return await Promise.all(
			channels.map(c => this.openRegistrationInChannel(c, tournament.name, tournament.description))
		);
	}

	private async warnClosedParticipant(participant: string, name: string): Promise<string> {
		const channel = await bot.getDMChannel(participant);
		const msg = await channel.createMessage(
			`Sorry, the ${name} tournament you registered for has started, and you had not submitted a valid decklist, so you have been dropped.
			If you think this is a mistake, contact the tournament organiser.`
		);
		return msg.id;
	}

	private async deleteRegisterMessage(ids: { channel: string; message: string }): Promise<void> {
		const message = await bot.getMessage(ids.channel, ids.message);
		await message.delete();
		await removeRegisterMessage(ids.message, ids.channel);
	}

	private async startRound(channelId: string, url: string, round: number, name: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const role = await this.getRole(channelId);
		const message = `Round ${round} of ${name} has begun! <@&${role}>\nPairings: https://challonge.com/${url}`;
		const msg = await channel.createMessage(message);
		return msg.id;
	}

	public async start(organiser: string): Promise<string[]> {
		await this.verifyOrganiser(organiser);
		const tournament = await this.getTournament();
		if (tournament.confirmedParticipants.length < 2) {
			throw new MiscUserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		await challonge.startTournament(this.id, {});
		const tournData = await challonge.showTournament(this.id);
		const removedIDs = await startTournament(this.id, organiser, tournData.tournament.swiss_rounds);
		await Promise.all(removedIDs.map(i => this.warnClosedParticipant(i, tournament.name)));
		const messages = tournament.registerMessages;
		await Promise.all(messages.map(this.deleteRegisterMessage));
		const channels = tournament.publicChannels;
		const announcements = await Promise.all(channels.map(c => this.startRound(c, this.id, 1, tournament.name)));
		return announcements;
	}

	public async submitScore(
		winnerId: string,
		winnerScore: number,
		loserScore: number,
		organiser: string
	): Promise<ChallongeMatch> {
		await this.verifyOrganiser(organiser);
		const doc = await this.getTournament();
		const winner = doc.confirmedParticipants.find(p => p.discord === winnerId);
		if (!winner) {
			throw new MiscUserError(`Could not find a participant for <@${winnerId}>!`);
		}
		const matches = await challonge.indexMatches(this.id, "open", winner.challongeId);
		if (matches.length < 1) {
			throw new MiscUserError(`Could not find an unfinished match for <@${winnerId}>!`);
		}
		const match = matches[0]; // if there's more than one something's gone very wack
		return await challonge.updateMatch(this.id, match.match.id.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: winner.challongeId,
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: `${winnerScore}-${loserScore}`
		});
	}

	private async tieMatch(matchId: number): Promise<ChallongeMatch> {
		return await challonge.updateMatch(this.id, matchId.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: "tie",
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: "0-0"
		});
	}

	public async nextRound(organiser: string): Promise<number> {
		await this.verifyOrganiser(organiser);
		const matches = await challonge.indexMatches(this.id, "open");
		await Promise.all(matches.map(m => this.tieMatch(m.match.id)));
		const round = await nextRound(this.id, organiser);
		// if was last round
		if (round === -1) {
			await this.finishTournament(organiser);
			return -1;
		}
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		await Promise.all(channels.map(c => this.startRound(c, this.id, round, tournament.name)));
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
		return msg.id;
	}

	public async finishTournament(organiser: string, cancel = false): Promise<void> {
		await this.verifyOrganiser(organiser);
		const tournament = await this.getTournament();
		const channels = tournament.publicChannels;
		await Promise.all(channels.map(c => this.sendConclusionMessage(c, this.id, tournament.name, cancel)));
		await challonge.finaliseTournament(this.id, {});
		await finishTournament(this.id, organiser);
		delete tournaments[this.id];
	}

	public async addOrganiser(organiser: string, newOrganiser: string): Promise<boolean> {
		await this.verifyOrganiser(organiser);
		return await addOrganiser(newOrganiser, this.id);
	}

	public async removeOrganiser(organiser: string, toRemove: string): Promise<boolean> {
		await this.verifyOrganiser(organiser);
		if (organiser === toRemove) {
			throw new MiscUserError("You cannot remove yourself from organising a tournament!");
		}
		return await removeOrganiser(toRemove, this.id);
	}
}

bot.on("messageDelete", msg => {
	removeRegisterMessage(msg.id, msg.channel.id).catch(console.error);
});

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
			throw new MiscInternalError(`User ${userId} added to non-existent tournament!`);
		}
		await chan.createMessage(
			`You have successfully registered for ${tournament.name}. ` +
				"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
		);
	}
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

bot.on("messageReactionRemove", async (msg, emoji, userId) => {
	if (userId === bot.user.id) {
		return;
	}
	// remove pending participant
	// TODO: Drop corresponding name from Challonge
	if (emoji.name === CHECK_EMOJI && (await removePendingParticipant(msg.id, msg.channel.id, userId))) {
		const chan = await bot.getDMChannel(userId);
		const tournament = await findTournamentByRegisterMessage(msg.id, msg.channel.id);
		if (!tournament) {
			// impossible because of removePendingParticipant except in the case of a race condition
			throw new MiscInternalError(`User ${userId} removed from non-existent tournament!`);
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
		console.error(e);
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
		} catch (e) {
			if (e instanceof DeckNotFoundError) {
				await msg.channel.createMessage(e.message);
			} else {
				// nowhere to throw
				console.error(e);
			}
		}
	}
}

getOngoingTournaments().then(ts => {
	for (const t of ts) {
		tournaments[t.challongeId] = new Tournament(t.challongeId);
	}
	console.log("Loaded persistent tournaments!");
});
