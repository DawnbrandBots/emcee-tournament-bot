import { removeAnnouncementChannel } from "./actions";
import { discord } from "./discordEris";
import { DiscordMessageIn } from "./discordGeneric";
import {
	addAnnouncementChannel,
	addHost,
	authenticateHost,
	createTournament,
	removeHost,
	updateTournament,
	openTournament,
	startTournament
} from "./tournamentManager";

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
