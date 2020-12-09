import { removeAnnouncementChannel } from "./actions";
import { prettyPrint } from "./discordDeck";
import { discord } from "./discordEris";
import { DiscordMessageIn } from "./discordGeneric";
import { UserError } from "./errors";
import {
	addAnnouncementChannel,
	addHost,
	authenticateHost,
	createTournament,
	removeHost,
	updateTournament,
	openTournament,
	startTournament,
	authenticatePlayer,
	submitScore,
	nextRound,
	listTournaments,
	listPlayers,
	getPlayerDeck
} from "./tournamentManager";

async function commandListTournaments(msg: DiscordMessageIn): Promise<void> {
	await discord.authenticateTO(msg);
	const list = await listTournaments();
	await msg.reply(list);
}

discord.registerCommand("list", commandListTournaments);

async function commandCreateTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	await discord.authenticateTO(msg);
	const [name, desc] = args;
	const [id, url] = await createTournament(name, desc);
	await msg.reply(
		`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
	);
}

discord.registerCommand("create", commandCreateTournament);

async function commandUpdateTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id, name, desc] = args;
	await authenticateHost(id, msg.author);
	await updateTournament(id, name, desc);
	await msg.reply(`{
		Tournament \`${id}\` updated! It now has the name ${name} and the given description.
	}`);
}

discord.registerCommand("update", commandUpdateTournament);

async function commandAddChannel(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const id = args[0];
	let [, type, channel] = args;
	await authenticateHost(id, msg.author);
	if (!(type === "private")) {
		type = "public";
	}
	// TODO: Parse actual channel mention. Just sketching out the structure for now.
	if (!channel) {
		channel = msg.channel;
	}
	await addAnnouncementChannel(id, channel, type as "public" | "private");
	await discord.sendMessage(`This channel added as a ${type} announcement channel for Tournament ${id}!`, channel);
	await msg.reply(`${discord.mentionChannel(channel)} added as a ${type} announcement channel for Tournament ${id}!`);
}

discord.registerCommand("addchannel", commandAddChannel);

async function commandRemoveChannel(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const id = args[0];
	let [, type, channel] = args;
	await authenticateHost(id, msg.author);
	if (!(type === "private")) {
		type = "public";
	}
	// TODO: Parse actual channel mention. Just sketching out the structure for now.
	if (!channel) {
		channel = msg.channel;
	}
	await removeAnnouncementChannel(id, channel, type as "public" | "private");
	await discord.sendMessage(`This channel removed as a ${type} announcement channel for Tournament ${id}!`, channel);
	await msg.reply(
		`${discord.mentionChannel(channel)} removed as a ${type} announcement channel for Tournament ${id}!`
	);
}

discord.registerCommand("addchannel", commandRemoveChannel);

async function commandAddHost(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	const newHost = discord.getMentionedUser(msg);
	await addHost(id, newHost);
	await msg.reply(`${discord.mentionUser(newHost)} added as a host for Tournament ${id}!`);
}

discord.registerCommand("addhost", commandAddHost);

async function commandRemoveHost(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	const newHost = discord.getMentionedUser(msg);
	await removeHost(id, newHost);
	await msg.reply(`${discord.mentionUser(newHost)} removed as a host for Tournament ${id}!`);
}

discord.registerCommand("removehost", commandRemoveHost);

async function commandOpenTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	await openTournament(id);
	await msg.reply(`Tournament ${id} opened for registration!`);
}

discord.registerCommand("open", commandOpenTournament);

async function commandStartTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	await startTournament(id);
	await msg.reply(`Tournament ${id} successfully commenced!`);
}

discord.registerCommand("start", commandStartTournament);

async function commandCancelTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	await startTournament(id);
	await msg.reply(`Tournament ${id} successfully canceled.`);
}

discord.registerCommand("cancel", commandCancelTournament);

// TODO infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
async function commandSubmitScore(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id, score] = args;
	await authenticatePlayer(id, msg.author);
	const scores = score.split("-");
	const scoreNums = scores.map(s => parseInt(s, 10));
	if (scoreNums.length < 2) {
		throw new UserError("Must provide score in format `#-#` e.g. `2-1`.");
	}
	await submitScore(id, msg.author, scoreNums[0], scoreNums[1]);
	await msg.reply(
		`Score of ${scoreNums[0]}-${scoreNums[1]} recorded for ${discord.mentionUser(msg.author)} in Tournament ${id}.`
	);
}

discord.registerCommand("score", commandSubmitScore);

async function commandNextRound(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	const round = await nextRound(id);
	await msg.reply(`Tournament ${id} successfully progressed to round ${round}.`);
}

discord.registerCommand("round", commandNextRound);

async function commandListPlayers(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	const list = await listPlayers(id);
	await msg.reply(list);
}

discord.registerCommand("players", commandListPlayers);

async function commandGetDeck(msg: DiscordMessageIn, args: string[]): Promise<void> {
	const [id] = args;
	await authenticateHost(id, msg.author);
	const player = discord.getMentionedUser(msg);
	const deck = await getPlayerDeck(id, player);
	// TODO: Use player structs or add a name getter to the interface so we can name this file better.
	const [message, attachment] = prettyPrint(deck, `${player}.ydk`);
	await msg.reply(message, attachment);
}

discord.registerCommand("deck", commandGetDeck);
