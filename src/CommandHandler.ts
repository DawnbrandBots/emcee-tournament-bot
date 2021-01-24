import { Command, CommandDefinition } from "./Command";
import * as commands from "./commands";
import { DiscordInterface } from "./discord/interface";
import { TournamentInterface } from "./TournamentManager";

export function initializeBehaviours(prefix: string, discord: DiscordInterface, tm: TournamentInterface): void {
	// Note: .bind may be significantly less performant than an arrow lambda
	discord.onMessage(tm.confirmPlayer.bind(tm));
	discord.onDelete(tm.cleanRegistration.bind(tm));
	discord.onLeave(tm.cleanPlayer.bind(tm));

	const handlers: Record<string, Command> = {};
	for (const name in commands) {
		handlers[name] = new Command((commands as Record<string, CommandDefinition>)[name]);
	}
	const support = { discord, tournamentManager: tm };
	discord.onPing(msg => handlers["help"]?.run(msg, [], support));
	discord.onMessage(async msg => {
		if (!msg.content.startsWith(prefix)) {
			return;
		}
		const terms = msg.content.split(" ");
		const cmdName = terms[0].slice(prefix.length).toLowerCase();
		const args = terms
			.slice(1) // this works fine and returns an empty array if there's only 1 element in terms
			.join(" ")
			.split("|")
			.map(s => s.trim());
		await handlers[cmdName]?.run(msg, args, support);
	});
}
