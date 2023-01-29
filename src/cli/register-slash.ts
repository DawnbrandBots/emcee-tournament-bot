// Adapted from https://github.com/DawnbrandBots/bastion-bot/blob/master/src/commands/index.ts
import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v10";
import dotenv from "dotenv";
import { ChannelCommand } from "../slash/channel";
import { CreateCommand } from "../slash/create";
import { DeckCommand } from "../slash/deck";
import { DropCommand } from "../slash/drop";
import { ForceDropContextCommand, ForceDropSlashCommand } from "../slash/forcedrop";
import { HostCommand } from "../slash/host";
import { InfoCommand } from "../slash/info";
import { TimerCommand } from "../slash/timer";
import { UpdateCommand } from "../slash/update";
import { FinishCommand } from "../slash/finish";
import { CsvCommand } from "../slash/csv";
import { ListCommand } from "../slash/list";

export const classes = [
	// Register here and in events/interaction.ts
	TimerCommand,
	CreateCommand,
	HostCommand,
	ChannelCommand,
	UpdateCommand,
	InfoCommand,
	ForceDropSlashCommand,
	ForceDropContextCommand,
	DropCommand,
	DeckCommand,
	FinishCommand,
	CsvCommand,
	ListCommand
];

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
	// Duplicate command metadata if they register any aliases
	const commands = classes.map(command => command.meta);
	console.log("Generated command metadata:");
	console.log(JSON.stringify(commands, null, 4));

	const api = new REST().setToken(`${process.env.DISCORD_TOKEN}`);

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
	console.log(JSON.stringify(created, null, 4));
}

if (require.main === module) {
	const args = process.argv.slice(2);
	if (!args.length) {
		console.error("Missing guild ID arguments!");
		process.exit(1);
	}
	dotenv.config();
	for (const server of args) {
		registerSlashCommands(server as `${bigint}`);
	}
}
