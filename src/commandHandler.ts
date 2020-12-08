import { discord } from "./discordEris";
import { DiscordMessageIn } from "./discordGeneric";
import { authenticateHost, createTournament, updateTournament } from "./tournamentManager";

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
