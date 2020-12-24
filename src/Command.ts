import { DiscordInterface, DiscordMessageIn } from "./discord/interface";
import { TournamentInterface } from "./TournamentManager";

export interface CommandSupport {
	discord: DiscordInterface;
	tournamentManager: TournamentInterface;
}

export interface CommandDefinition {
	name: string;
	requiredArgs: string[];
	executor: (message: DiscordMessageIn, args: string[], support: CommandSupport) => Promise<void>;
}

export class Command {
	protected definition: CommandDefinition;

	constructor(definition: CommandDefinition) {
		this.definition = definition; // copy?
	}

	protected validateArgs(args: string[]): string {
		// If not enough arguments are provided or some of them are falsy
		if (this.definition.requiredArgs.length > args.length || args.find(value => !value)) {
			return `Usage: ${this.definition.name} ${this.definition.requiredArgs.join("|")}`;
		}
		return "";
	}
}
