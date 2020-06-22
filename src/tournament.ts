import { challonge, ChallongeMatch } from "./challonge";
import { GuildChannel, Message, TextChannel, PrivateChannel, GuildTextableChannel, User } from "eris";
import {
	initTournament,
	isOrganizing,
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
	addOrganizer,
	removeOrganizer
} from "./actions";
import { bot } from "./bot";
import { TournamentModel, TournamentDoc } from "./models";
import { DiscordDeck } from "./discordDeck";

const CHECK_EMOJI = "✅";

const tournaments: {
	[id: string]: Tournament;
} = {};

export class Tournament {
	private id: string;
	private roles: { [guild: string]: string } = {};
	constructor(id: string) {
		this.id = id;
	}

	public static async init(name: string, description: string, msg: Message): Promise<Tournament> {
		if (!(msg.channel instanceof GuildChannel)) {
			throw new Error("Tournaments cannot be constructed in Direct Messages!");
		}
		const tournament = await challonge.createTournament({
			name,
			description,
			tournament_type: "swiss"
		});

		await initTournament(msg.author.id, msg.channel.guild.id, tournament.tournament.url, name, description);

		const tourn = new Tournament(tournament.tournament.id.toString());
		tournaments[tourn.id] = tourn;
		return tourn;
	}

	private async getTournament(): Promise<TournamentDoc> {
		const tournament = await TournamentModel.findById(this.id);
		if (!tournament) {
			// should be impossible, but checking anyway is better practice than supressing typescript
			throw new Error(`Unknown tournament ${this.id}`);
		}
		return tournament;
	}

	public async getRole(channelId: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof GuildChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		const guild = channel.guild;
		if (guild.id in this.roles) {
			return this.roles[guild.id];
		}
		const role = await guild.createRole(
			{
				name: "MC-Tournament-" + this.id,
				color: 0xe67e22
			},
			"Auto-created by Emcee bot."
		);
		this.roles[guild.id] = role.id;
		return role.id;
	}

	public async addChannel(channelId: string, organiser: string): Promise<string> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		const tournament = await this.getTournament();
		const mes = await channel.createMessage(
			"This channel now displaying announcements for " + (tournament.name || this.id)
		);
		await addAnnouncementChannel(channelId, this.id, organiser);
		return mes.id;
	}

	public async removeChannel(channelId: string, organiser: string): Promise<void> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		if (!(await removeAnnouncementChannel(channelId, this.id, organiser))) {
			throw new Error("Channel " + channel.name + "is not a registered announcement channel");
		}
		const tournament = await this.getTournament();
		await channel.createMessage(
			"This channel no longer displaying announcements for " + (tournament.name || this.id)
		);
	}

	private async openRegistrationInChannel(channelId: string, name?: string, desc?: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		let message = "**New Tournament Open";
		if (name) {
			message += ": " + name;
		}
		message += "**\n";
		if (desc) {
			message += desc + "\n";
		}
		message += "Click the " + CHECK_EMOJI + " below to sign up!";
		const msg = await channel.createMessage(message);
		await msg.addReaction(CHECK_EMOJI);
		return msg.id;
	}

	public async openRegistration(organiser: string): Promise<string[]> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const tournament = await this.getTournament();
		const channels = tournament.discordChannels;
		return await Promise.all(
			channels.map(c => this.openRegistrationInChannel(c, tournament.name, tournament.description))
		);
	}

	private async warnClosedParticipant(participant: string, name?: string): Promise<string> {
		const channel = await bot.getDMChannel(participant);
		let message = "Sorry, the tournament you registered for";
		if (name) {
			message += ", " + name + ",";
		}
		message +=
			" has started, and you had not submitted a valid decklist, so you have been dropped. If you think this is a mistake, contact the tournament organiser.";
		const msg = await channel.createMessage(message);
		return msg.id;
	}

	private async deleteRegisterMessage(ids: { channel: string; message: string }): Promise<void> {
		const message = await bot.getMessage(ids.channel, ids.message);
		await message.delete();
		await removeRegisterMessage(ids.message, ids.channel);
	}

	private async startRound(channelId: string, url: string, round: number, name?: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof GuildTextableChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		const role = await this.getRole(channelId);
		const message =
			"Round " +
			round +
			" of " +
			(name || "the tournament") +
			" has begun! <@&" +
			role +
			">\nPairings: https://challonge.com/" +
			url;
		const msg = await channel.createMessage(message);
		return msg.id;
	}

	public async start(organiser: string): Promise<string[]> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const tournament = await this.getTournament();
		if (tournament.confirmedParticipants.length < 2) {
			throw new Error("Cannot start a tournament without at least 2 confirmed participants!");
		}
		const removedIDs = await startTournament(this.id, organiser);
		await Promise.all(removedIDs.map(i => this.warnClosedParticipant(i, tournament.name)));
		const messages = tournament.registerMessages;
		await Promise.all(messages.map(this.deleteRegisterMessage));
		await challonge.startTournament(this.id, {});
		const channels = tournament.discordChannels;
		const announcements = await Promise.all(channels.map(c => this.startRound(c, this.id, 1, tournament.name)));
		return announcements;
	}

	public async submitScore(
		winnerId: string,
		winnerScore: number,
		loserScore: number,
		organiser: string
	): Promise<ChallongeMatch> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const doc = await this.getTournament();
		const winner = doc.confirmedParticipants.find(p => p.discord === winnerId);
		if (!winner) {
			throw new Error("Could not find a participant for <@" + winnerId + ">!");
		}
		const matches = await challonge.indexMatches(this.id, "open", winner.challongeId);
		if (matches.length < 1) {
			throw new Error("Could not find an unfinished match for <@" + winnerId + ">!");
		}
		const match = matches[0]; // if there's more than one something's gone very wack
		return await challonge.updateMatch(this.id, match.match.id.toString(), {
			winner_id: winner.challongeId,
			scores_csv: winnerScore + "-" + loserScore
		});
	}

	private async tieMatch(matchId: number): Promise<ChallongeMatch> {
		return await challonge.updateMatch(this.id, matchId.toString(), {
			winner_id: "tie",
			scores_csv: "0-0"
		});
	}

	public async nextRound(organiser: string): Promise<void> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const matches = await challonge.indexMatches(this.id, "open");
		await Promise.all(matches.map(m => this.tieMatch(m.match.id)));
		const round = await nextRound(this.id, organiser);
		// if was last round
		if (round === -1) {
			return await this.finishTournament(organiser);
		}
		const tournament = await this.getTournament();
		const channels = tournament.discordChannels;
		await Promise.all(channels.map(c => this.startRound(c, this.id, round, tournament.name)));
	}

	private async sendConclusionMessage(channelId: string, url: string, name?: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof GuildTextableChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		const role = await this.getRole(channelId);
		const message =
			(name || "The tournament") +
			" has concluded! Thank you all for playing! <@&" +
			role +
			">\nResults: https://challonge.com/" +
			url;
		const msg = await channel.createMessage(message);
		const roleMembers = channel.guild.members.filter(m => m.roles.includes(role));
		await Promise.all(roleMembers.map(m => m.removeRole(role, "Tournament concluded")));
		return msg.id;
	}

	public async finishTournament(organiser: string): Promise<void> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		const tournament = await this.getTournament();
		const channels = tournament.discordChannels;
		await Promise.all(channels.map(c => this.sendConclusionMessage(c, this.id, tournament.name)));
		await finishTournament(this.id, organiser);
		delete tournaments[this.id];
	}

	public async addOrganiser(organiser: string, newOrganiser: string): Promise<boolean> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		return await addOrganizer(newOrganiser, this.id);
	}

	public async removeOrganiser(organiser: string, toRemove: string): Promise<boolean> {
		if (!isOrganizing(organiser, this.id)) {
			throw new Error(`Organizer ${organiser} not authorized for tournament ${this.id}`);
		}
		if (organiser === toRemove) {
			throw new Error("You cannot remove yourself from organising a tournament!");
		}
		return await removeOrganizer(toRemove, this.id);
	}
}

bot.on("messageDelete", msg => {
	removeRegisterMessage(msg.id, msg.channel.id).catch(console.error);
});

bot.on("messageReactionAdd", async (msg, emoji, userID) => {
	// register pending participant
	if (emoji.name === CHECK_EMOJI && (await addPendingParticipant(msg.id, msg.channel.id, userID))) {
		const chan = await bot.getDMChannel(userID);
		const tournId = await findTournamentByRegisterMessage(msg.channel.id, msg.id);
		if (!tournId) {
			throw new Error("User " + userID + " removed from non-existent tournament!");
		}
		const tourn = await TournamentModel.findOne({ challongeId: tournId });
		if (!tourn) {
			throw new Error("User " + userID + " removed from non-existent tournament!");
		}
		await chan.createMessage(
			"You have successfully registered" +
				(tourn.name ? " for " + tourn.name : "") +
				". Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
		);
	}
});

bot.on("messageReactionRemove", async (msg, emoji, userID) => {
	// remove pending participant
	if (emoji.name === CHECK_EMOJI && (await removePendingParticipant(msg.id, msg.channel.id, userID))) {
		const chan = await bot.getDMChannel(userID);
		const tournId = await findTournamentByRegisterMessage(msg.channel.id, msg.id);
		if (!tournId) {
			throw new Error("User " + userID + " removed from non-existent tournament!");
		}
		const tourn = await TournamentModel.findOne({ challongeId: tournId });
		if (!tourn) {
			throw new Error("User " + userID + " removed from non-existent tournament!");
		}
		await chan.createMessage("You have successfully dropped" + (tourn.name ? " from " + tourn.name : "") + ".");
	}
});

async function grantTournamentRole(channelId: string, user: string, tournamentId: string): Promise<boolean> {
	const channel = bot.getChannel(channelId);
	if (!(channel instanceof GuildChannel)) {
		throw new Error("Channel " + channelId + " is not a valid text channel");
	}
	const member = channel.guild.members.get(user);
	if (!member) {
		return false;
	}
	const tournament = tournaments[tournamentId];
	const role = await tournament.getRole(channelId);
	await member.addRole(role, "Tournament registration");
	return true;
}

bot.on("messageCreate", async msg => {
	if (msg.author.bot) {
		return;
	}
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
				if (e.message !== "Must provide either attached `.ydk` file or valid `ydke://` URL!") {
					throw e;
				}
			}
			return;
		}
		if (docs.length > 1) {
			await msg.channel.createMessage(
				"You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\n" +
					docs.map(t => t.name || t.challongeId).join("\n")
			);
			return;
		}
		// length === 1
		const doc = docs[0];
		try {
			const deck = (await DiscordDeck.constructFromMessage(msg)) as DiscordDeck;
			const result = await deck.validate();
			if (result.length > 0) {
				await msg.channel.createMessage(
					"Your deck is not legal, so you have not been registered. Please fix the issues listed below and try submitting again."
				);
				await deck.sendProfile(msg);
				return;
			}
			const challongeUser = await challonge.addParticipant(doc.challongeId, {
				name: msg.author.username + "#" + msg.author.discriminator,
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
			const channels = doc.discordChannels;
			await Promise.all(channels.map(c => grantTournamentRole(c, msg.author.id, doc.challongeId)));
			await msg.channel.createMessage(
				"Congratulations! You have been registered" +
					(doc.name ? "in " + doc.name : "") +
					" with the following deck."
			);
			await deck.sendProfile(msg);
			// TODO: send deck to TO channels
		} catch (e) {
			if (e.message === "Must provide either attached `.ydk` file or valid `ydke://` URL!") {
				await msg.channel.createMessage(e.message);
			} else {
				throw e;
			}
		}
	}
});
