import { Message, GuildTextableChannel } from "eris";
import { Tournament, getTournament, AssertTextChannelError } from "../tournament";
import { findTournament, TournamentNotFoundError } from "../actions";
import { bot } from "../bot";

export async function parseCommand(msg: Message): Promise<void> {
	// const args = content.split("|")
	throw new Error("Not yet implemented!");
}

async function createTournament(msg: Message, args: string[]): Promise<void> {
	const [name, desc] = args;
	await Tournament.init(name, desc, msg);
	await msg.channel.createMessage(`Tournament ${name} created!`);
}

async function addChannel(msg: Message, args: string[]): Promise<void> {
	const [name, isPrivate, channelMention] = args;
	const doc = await findTournament(name);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	let channel: GuildTextableChannel | undefined;
	if (channelMention) {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(channelMention);
		if (channelMatch !== null) {
			const channelCandidate = bot.getChannel(channelMatch[1]);
			if (channelCandidate && channelCandidate instanceof GuildTextableChannel) {
				channel = channelCandidate;
			}
		}
	}
	if (!channel) {
		if (!(msg.channel instanceof GuildTextableChannel)) {
			throw new AssertTextChannelError(msg.channel.id);
		}
		channel = msg.channel;
	}
	tournament.addChannel(channel.id, msg.author.id, isPrivate.toLowerCase() === "private");
}

async function removeChannel(msg: Message, args: string[]): Promise<void> {
	const [name, isPrivate, channelMention] = args;
	const doc = await findTournament(name);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	let channel: GuildTextableChannel | undefined;
	if (channelMention) {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(channelMention);
		if (channelMatch !== null) {
			const channelCandidate = bot.getChannel(channelMatch[1]);
			if (channelCandidate && channelCandidate instanceof GuildTextableChannel) {
				channel = channelCandidate;
			}
		}
	}
	if (!channel) {
		if (!(msg.channel instanceof GuildTextableChannel)) {
			throw new AssertTextChannelError(msg.channel.id);
		}
		channel = msg.channel;
	}
	tournament.removeChannel(channel.id, msg.author.id, isPrivate.toLowerCase() === "private");
}
