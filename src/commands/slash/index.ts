import { REST } from "@discordjs/rest";
import { APIUser, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v9";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";

// Copied from Bastion and hardcoded for the one experimental command

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
	// Duplicate command metadata if they register any aliases
	const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
		{
			name: "timer",
			description: "Starts a timer in the current channel.",
			options: [
				{
					type: ApplicationCommandOptionTypes.STRING.valueOf(),
					name: "duration",
					description: "How long to run the timer for in the form `hh:mm` or `mm`.",
					required: true
				},
				{
					type: ApplicationCommandOptionTypes.STRING.valueOf(),
					name: "final_message",
					description: "What to send out when the timer runs out",
					required: true
				}
			]
		}
	];

	// The default version is 9, but we'll be explicit in case unexpected version bumps happen
	const api = new REST({ version: "9" }).setToken(`${process.env.DISCORD_TOKEN}`);

	// Server commands deploy instantly, but global commands may take up to an hour to roll out
	const botUser = (await api.get(Routes.user())) as APIUser;
	console.log(botUser.id);
	console.log(`${botUser.username}#${botUser.discriminator}`);

	const created = await api.put(
		guild === undefined
			? Routes.applicationCommands(botUser.id)
			: Routes.applicationGuildCommands(botUser.id, guild),
		{ body: commands }
	);
	console.log("Created Slash Commands:");
	console.log(created);
}

if (require.main === module) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerSlashCommands(process.argv[2] as any);
}
