import { discord } from "./discordEris";
import { DiscordMessageIn } from "./discordGeneric";
import { addAnnouncementChannel, authenticateHost, createTournament, updateTournament } from "./tournamentManager";

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
	await msg.reply(`${discord.mentionChannel(channel)} added as a ${type} announcement channel!`);
}

discord.registerCommand("addchannel", commandAddChannel);
