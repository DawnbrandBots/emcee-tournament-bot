import { Message } from "eris";
import { Tournament, mention } from "../tournament";
import { getTournamentInterface, getMentionedUserId } from "./utils";
import { getOngoingTournaments, getPlayerFromDiscord } from "../actions";
import { TypedDeck } from "ydke";
import { DiscordDeck } from "../discordDeck";
import { bot } from "../bot";
import { UserError } from "../errors";
import { validateTORole } from ".";

export async function getPlayerDeck(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [, doc] = await getTournamentInterface(id, msg.author.id);
	const user = getMentionedUserId(msg);
	const player = await getPlayerFromDiscord(doc.challongeId, user);
	if (!player) {
		throw new UserError(`Could not find a player in tournament ${doc.name} for Discord user <@${user}>`);
	}
	const record: TypedDeck = {
		main: Uint32Array.from(player.deck.main),
		extra: Uint32Array.from(player.deck.extra),
		side: Uint32Array.from(player.deck.side)
	};
	const deck = DiscordDeck.constructFromRecord(record);
	const discordUser = bot.users.get(user);
	await deck.sendProfile(msg.channel, discordUser ? `${discordUser.username}#${discordUser.discriminator}ydk` : user);
}

export async function dropPlayer(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tourn] = await getTournamentInterface(id, msg.author.id);
	const discord = getMentionedUserId(msg);
	const result = await tourn.dropPlayer(msg.author.id, discord);
	if (result) {
		await msg.channel.createMessage(`<@${discord}> successfully dropped from tournament ${id}.`);
	}
}

export async function sync(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [tourn] = await getTournamentInterface(id, msg.author.id);
	await tourn.synchronise(msg.author.id);
	await msg.channel.createMessage(`Tournament ${id} data successfully updated to reflect Challonge remote.`);
}
