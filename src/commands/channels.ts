import { Message, TextChannel } from "eris";
import { getTournamentInterface } from "./utils";
import { AssertTextChannelError } from "../tournament";
import { bot } from "../bot";

function getChannel(msg: Message, mention?: string): TextChannel {
	if (mention) {
		const channelRegex = /<#(\d+?)>/g;
		const channelMatch = channelRegex.exec(mention);
		if (channelMatch !== null) {
			const channelCandidate = bot.getChannel(channelMatch[1]);
			if (channelCandidate && channelCandidate instanceof TextChannel) {
				return channelCandidate;
			}
		}
	}

	if (!(msg.channel instanceof TextChannel)) {
		throw new AssertTextChannelError(msg.channel.id);
	}
	return msg.channel;
}

export async function addChannel(msg: Message, args: string[]): Promise<void> {
	const [id, privString, channelMention] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const channel = getChannel(msg, channelMention);
	const isPrivate = privString ? privString.toLowerCase() === "private" : false;
	await tournament.addChannel(channel.id, msg.author.id, isPrivate);
	const status = isPrivate ? "private" : "public";
	await msg.channel.createMessage(
		`<#${channel.id}> has successfully been added as a ${status} announcement channel for ${doc.name}.`
	);
}

export async function removeChannel(msg: Message, args: string[]): Promise<void> {
	const [id, privString, channelMention] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const channel = getChannel(msg, channelMention);
	const isPrivate = privString ? privString.toLowerCase() === "private" : false;
	await tournament.removeChannel(channel.id, msg.author.id, isPrivate);
	const status = isPrivate ? "private" : "public";
	await msg.channel.createMessage(
		`<#${channel.id}> has successfully been removed as a ${status} announcement channel for ${doc.name}.`
	);
}
