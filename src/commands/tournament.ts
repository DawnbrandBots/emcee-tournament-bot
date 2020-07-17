import { Message } from "eris";
import { Tournament } from "../tournament";
import { getTournamentInterface, getMentionedUserId } from "./utils";
import { getOngoingTournaments, getPlayerFromDiscord } from "../actions";
import { TypedDeck } from "ydke";
import { DiscordDeck } from "../discordDeck";
import { bot } from "../bot";
import { UserError } from "../errors";
import { validateTORole } from ".";

export async function createTournament(msg: Message, args: string[]): Promise<void> {
	await validateTORole(msg);
	const [name, desc] = args;
	if (name.length === 0 || desc.length === 0) {
		throw new UserError("You must provide a valid tournament name and description!");
	}
	const tournament = await Tournament.init(name, desc, msg);
	const [, doc] = await getTournamentInterface(tournament.id, msg.author.id);
	await msg.channel.createMessage(
		`Tournament ${name} created! You can find it at https://challonge.com/${doc.challongeId}. For future commands, refer to this tournament by the id \`${doc.challongeId}\``
	);
}
export async function updateTournament(msg: Message, args: string[]): Promise<void> {
	const [id, name, desc] = args;
	const [tournament, doc] = await getTournamentInterface(id, msg.author.id);
	const oldName = doc.name;
	const oldDesc = doc.description;
	if (name.length === 0 || desc.length === 0) {
		throw new UserError("You must provide a valid tournament name and description!");
	}
	const [newName, newDesc] = await tournament.updateTournament(name, desc, msg.author.id);
	await msg.channel.createMessage(
		`Tournament ${oldName} successfully renamed to ${newName}!\nPrevious description:\n${oldDesc}\nNew description:\n${newDesc}`
	);
}

export async function listTournaments(msg: Message): Promise<void> {
	await validateTORole(msg);
	const tournaments = await getOngoingTournaments();
	if (tournaments.length === 0) {
		await msg.channel.createMessage("There are no active tournaments!");
		return;
	}
	await msg.channel.createMessage(
		tournaments
			.map(
				t =>
					`ID: \`${t.challongeId}\`|Name: \`${t.name}\`|Status: \`${t.status}\`|Players: ${t.confirmedParticipants.length}`
			)
			.join("\n")
	);
}

export async function listPlayers(msg: Message, args: string[]): Promise<void> {
	const [id] = args;
	const [, doc] = await getTournamentInterface(id, msg.author.id);
	if (doc.confirmedParticipants.length === 0) {
		await msg.channel.createMessage("That tournament has no confirmed participants yet!");
		return;
	}
	await msg.channel.createMessage(doc.confirmedParticipants.map(p => `<@${p.discord}>`).join(", "));
}

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
