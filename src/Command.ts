import { Message } from "eris";
import { DiscordInterface } from "./discord/interface";
import { OrganiserRoleProvider } from "./role/organiser";
import { TournamentInterface } from "./TournamentManager";
import { reply } from "./util/discord";
import { UserError } from "./util/errors";
import { getLogger } from "./util/logger";

const logger = getLogger("command");

export interface CommandSupport {
	discord: DiscordInterface;
	tournamentManager: TournamentInterface;
	organiserRole: OrganiserRoleProvider;
}

// This is a composition-over-inheritance approach. In an inheritance model this
// would just be combined with command and executor would be an abstract method
// the subclasses must implement.
export interface CommandDefinition {
	name: string;
	requiredArgs: string[];
	executor: (message: Message, args: string[], support: CommandSupport) => Promise<void>;
}

export class Command {
	constructor(protected definition: CommandDefinition) {}

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

	protected log(msg: Message, extra: Record<string, unknown>): string {
		return JSON.stringify({
			channel: msg.channel.id,
			message: msg.id,
			user: msg.author,
			command: this.definition.name,
			...extra
		});
	}

	public async run(msg: Message, args: string[], support: CommandSupport): Promise<void> {
		logger.verbose(this.log(msg, { event: "attempt" }));
		const error = this.checkUsage(args);
		if (error) {
			logger.verbose(this.log(msg, { error }));
			await reply(msg, error).catch(logger.error);
			return;
		}
		try {
			logger.info(this.log(msg, { args, event: "execute" }));
			await this.definition.executor(msg, args, support);
			logger.info(this.log(msg, { args, event: "success" }));
		} catch (e) {
			if (e instanceof UserError) {
				logger.verbose(this.log(msg, { error: e.message }));
				await reply(msg, error).catch(logger.error);
				return;
			}
			logger.error(e); // internal error
		}
	}
}
