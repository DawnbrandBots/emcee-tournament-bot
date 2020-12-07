import { discord } from "./discordEris";
import { DiscordMessageIn } from "./discordGeneric";

async function commandCreateTournament(msg: DiscordMessageIn, args: string[]): Promise<void> {
	await discord.authenticateTO(msg);
	const [name, desc] = args;
	const [id, url] = await createTournament(name, desc);
	await msg.reply(
		`Tournament ${name} created! You can find it at ${url}. For future commands, refer to this tournament by the id \`${id}\`.`
	);
}

discord.registerCommand("create", commandCreateTournament);
