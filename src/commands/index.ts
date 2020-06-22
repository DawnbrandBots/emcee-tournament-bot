import { Message, GuildTextableChannel } from "eris";
import { Tournament, getTournament, AssertTextChannelError } from "../tournament";
import { findTournament, TournamentNotFoundError } from "../actions";
import { bot } from "../bot";

export async function parseCommand(msg: Message): Promise<void> {
	// const args = content.split("|")
	throw new Error("Not yet implemented!");
}

async function getTournamentInterface(id: string): Promise<Tournament> {
	const doc = await findTournament(id);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	return tournament;
}

function getChannel(msg: Message, mention?: string): GuildTextableChannel {
	if (mention) {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(mention);
		if (channelMatch !== null) {
			const channelCandidate = bot.getChannel(channelMatch[1]);
			if (channelCandidate && channelCandidate instanceof GuildTextableChannel) {
				return channelCandidate;
			}
		}
	}

	if (!(msg.channel instanceof GuildTextableChannel)) {
		throw new AssertTextChannelError(msg.channel.id);
	}
	return msg.channel;
}

async function createTournament(msg: Message, args: string[]): Promise<void> {
	const [name, desc] = args;
	await Tournament.init(name, desc, msg);
	await msg.channel.createMessage(`Tournament ${name} created!`);
}

async function addChannel(msg: Message, args: string[]): Promise<void> {
	const [id, isPrivate, channelMention] = args;
	const tournament = await getTournamentInterface(id);
	const channel = getChannel(msg, channelMention);
	tournament.addChannel(channel.id, msg.author.id, isPrivate.toLowerCase() === "private");
}

async function removeChannel(msg: Message, args: string[]): Promise<void> {
	const [id, isPrivate, channelMention] = args;
	const tournament = await getTournamentInterface(id);
	const channel = getChannel(msg, channelMention);
	tournament.removeChannel(channel.id, msg.author.id, isPrivate.toLowerCase() === "private");
}
