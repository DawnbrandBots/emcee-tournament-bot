import { DiscordInterface, DiscordMessageIn } from "./discord/interface";
import { TournamentInterface } from "./TournamentManager";
import { UserError } from "./util/errors";
import { getLogger } from "./util/logger";

const logger = getLogger("command");

export interface CommandSupport {
	discord: DiscordInterface;
	tournamentManager: TournamentInterface;
}

// This is a composition-over-inheritance approach. In an inheritance model this
// would just be combined with command and executor would be an abstract method
// the subclasses must implement.
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

	protected checkUsage(args: string[]): string {
		// If not enough arguments are provided or some of them are falsy
		if (
			this.definition.requiredArgs.length &&
			(this.definition.requiredArgs.length > args.length || args.findIndex(value => !value) !== -1)
		) {
			return `Usage: ${this.definition.name} ${this.definition.requiredArgs.join("|")}`;
		}
		return "";
	}

	protected log(msg: DiscordMessageIn, extra: Record<string, unknown>): string {
		return JSON.stringify({
			channel: msg.channelId,
			message: msg.id,
			user: msg.author,
			command: this.definition.name,
			...extra
		});
	}

	public async run(msg: DiscordMessageIn, args: string[], support: CommandSupport): Promise<void> {
		logger.verbose(this.log(msg, { event: "attempt" }));
		const error = this.checkUsage(args);
		if (error) {
			logger.verbose(this.log(msg, { error }));
			await msg.reply(error).catch(logger.error);
			return;
		}
		try {
			logger.info(this.log(msg, { args, event: "execute" }));
			await this.definition.executor(msg, args, support);
			logger.info(this.log(msg, { args, event: "success" }));
		} catch (e) {
			if (e instanceof UserError) {
				logger.verbose(this.log(msg, { error: e.message }));
				await msg.reply(e.message).catch(logger.error);
				return;
			}
			logger.error(e); // internal error
		}
	}
}
