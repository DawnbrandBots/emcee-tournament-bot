import { Message, GuildTextableChannel } from "eris";
import { Tournament, getTournament, AssertTextChannelError, MiscUserError, MiscInternalError } from "../tournament";
import { findTournament, TournamentNotFoundError, UnauthorisedOrganiserError, getPlayerFromId } from "../actions";
import { bot } from "../bot";
import { DeckNotFoundError } from "../discordDeck";
import { TournamentDoc } from "../models";

type UserError =
	| MiscUserError
	| DeckNotFoundError
	| UnauthorisedOrganiserError
	| TournamentNotFoundError
	| AssertTextChannelError;
type InternalError = MiscInternalError;

export async function parseCommand(msg: Message): Promise<void> {
	// const args = content.split("|")
	throw new Error("Not yet implemented!");
}

async function getTournamentInterface(id: string): Promise<[Tournament, TournamentDoc]> {
	const doc = await findTournament(id);
	const tournament = getTournament(doc.challongeId);
	if (!tournament) {
		throw new TournamentNotFoundError(doc.challongeId);
	}
	return [tournament, doc];
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
	if (name.length === 0 || desc.length === 0) {
		throw new MiscUserError("You must provide a valid tournament name and description!");
	}
	await Tournament.init(name, desc, msg);
	await msg.channel.createMessage(`Tournament ${name} created!`);
}

async function addChannel(msg: Message, args: string[]): Promise<void> {
	const [id, privString, channelMention] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const channel = getChannel(msg, channelMention);
	const isPrivate = privString.toLowerCase() === "private";
	await tournament.addChannel(channel.id, msg.author.id, isPrivate);
	const status = isPrivate ? "private" : "public";
	await msg.channel.createMessage(
		`<#${channel.id}> has successfully been added as a ${status} announcement channel for ${doc.name}.`
	);
}

async function removeChannel(msg: Message, args: string[]): Promise<void> {
	const [id, privString, channelMention] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const channel = getChannel(msg, channelMention);
	const isPrivate = privString.toLowerCase() === "private";
	await tournament.removeChannel(channel.id, msg.author.id, isPrivate);
	const status = isPrivate ? "private" : "public";
	await msg.channel.createMessage(
		`<#${channel.id}> has successfully been removed as a ${status} announcement channel for ${doc.name}.`
	);
}

async function open(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.openRegistration(msg.author.id);
	await msg.channel.createMessage(`${doc.name} has successfully been opened for registration.`);
}

async function start(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.start(msg.author.id);
	await msg.channel.createMessage(`${doc.name} has successfully been commenced.`);
}

function getMentionedUserId(msg: Message): string {
	const user = msg.mentions[0];
	if (!user) {
		throw new MiscUserError("You must @mention the winner of the match you are reporting for!");
	}
	return user.id;
}

async function getPlayerDiscord(tournamentId: string, playerId: number): Promise<string | undefined> {
	const player = await getPlayerFromId(tournamentId, playerId);
	return player?.discord;
}

async function submitScore(msg: Message, args: string[]): Promise<void> {
	const [id, score] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const winner = getMentionedUserId(msg);
	const scoreRegex = /(\d)-(\d)/;
	const scoreMatch = scoreRegex.exec(score);
	const winnerScore = parseInt(scoreMatch ? scoreMatch[1] : "");
	const loserScore = parseInt(scoreMatch ? scoreMatch[2] : "");
	if (!scoreMatch || isNaN(winnerScore) || isNaN(loserScore)) {
		throw new MiscUserError("You must report the score in the format `#-#`, with the winner first, e.g. `2-1`!");
	}
	const result = await tournament.submitScore(winner, winnerScore, loserScore, msg.author.id);
	const loser =
		result.match.winner_id === result.match.player1_id
			? await getPlayerDiscord(id, result.match.player2_id)
			: await getPlayerDiscord(id, result.match.player1_id);
	const loserString = loser ? ` over <@${loser}>` : "";
	await msg.channel.createMessage(
		`Score successfully submitted for ${doc.name}. <@${winner}> won ${scoreMatch[0]}${loserString}.`
	);
}

async function nextRound(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const round = await tournament.nextRound(msg.author.id);
	if (round === -1) {
		await msg.channel.createMessage(`${doc.name} has successfully been concluded.`);
	} else {
		await msg.channel.createMessage(`${doc.name} has successfully progressed to Round ${round}.`);
	}
}

async function cancelTournament(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	await tournament.finishTournament(msg.author.id, true);
	await msg.channel.createMessage(`${doc.name} has successfully been cancelled.`);
}

async function addOrganiser(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const organiser = getMentionedUserId(msg);
	if (await tournament.addOrganiser(msg.author.id, organiser)) {
		await msg.channel.createMessage(`<@${organiser}> successfully added as an organiser for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${organiser}> is already an organiser for ${doc.name}.`);
	}
}

async function removeOrganiser(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const organiser = getMentionedUserId(msg);
	if (await tournament.addOrganiser(msg.author.id, organiser)) {
		await msg.channel.createMessage(`<@${organiser}> successfully added as an organiser for ${doc.name}.`);
	} else {
		await msg.channel.createMessage(`<@${organiser}> is already an organiser for ${doc.name}.`);
	}
}

async function updateTournament(msg: Message, args: string[]): Promise<void> {
	const [id, name, desc] = args;
	const [tournament, doc] = await getTournamentInterface(id);
	const oldName = doc.name;
	const oldDesc = doc.description;
	if (name.length === 0 || desc.length === 0) {
		throw new MiscUserError("You must provide a valid tournament name and description!");
	}
	const [newName, newDesc] = await tournament.updateTournament(name, desc, msg.author.id);
	await msg.channel.createMessage(
		`Tournament ${oldName} successfully renamed to ${newName}!\nPrevious description:\n${oldDesc}\nNew description:\n${newDesc}`
	);
}
