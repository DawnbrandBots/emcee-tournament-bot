import { challonge } from "./challonge";
import { GuildChannel, Message, TextChannel, PrivateChannel, GuildTextableChannel } from "eris";
import {
	initTournament,
	isOrganizing,
	addAnnouncementChannel,
	removeAnnouncementChannel,
	startTournament,
	removeRegisterMessage,
	confirmParticipant,
	findTournamentByRegisterMessage,
	removePendingParticipant
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

	private async getRole(channelId: string): Promise<string> {
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

	private async startTournamentInChannel(channelId: string, url: string, name?: string): Promise<string> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof GuildTextableChannel)) {
			throw new Error("Channel " + channelId + " is not a valid text channel");
		}
		const role = await this.getRole(channelId);
		const message =
			"Round 1 of " +
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
		const announcements = await Promise.all(
			channels.map(c => this.startTournamentInChannel(c, this.id, tournament.name))
		);
		return announcements;
	}

	public async submitScore(
		winnerId: string,
		winnerScore: number,
		loserScore: number,
		organiser: string
	): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async nextRound(organiser: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}

	public async finishTournament(organiser: string): Promise<void> {
		throw new Error("Not yet implemented!");
	}
}

bot.on("messageDelete", async msg => {
	removeRegisterMessage(msg.id, msg.channel.id).catch(console.error);
});

bot.on("messageReactionAdd", (msg, emoji, userID) => {
	// register pending participant
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
