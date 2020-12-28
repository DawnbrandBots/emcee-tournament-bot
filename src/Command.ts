import { DiscordInterface, DiscordMessageIn } from "./discord/interface";
import { TournamentInterface } from "./TournamentManager";
import { UserError } from "./util/errors";
import logger from "./util/logger";

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
		if (this.definition.requiredArgs.length > args.length || args.find(value => !value)) {
			return `Usage: ${this.definition.name} ${this.definition.requiredArgs.join("|")}`;
		}
		return "";
	}

	public async run(msg: DiscordMessageIn, args: string[], support: CommandSupport): Promise<void> {
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: this.definition.name,
				event: "attempt"
			})
		);
		const error = this.checkUsage(args);
		if (error) {
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author,
					command: this.definition.name,
					error
				})
			);
			await msg.reply(error).catch(logger.error);
			return;
		}
		try {
			logger.info(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: msg.author,
					command: this.definition.name,
					args
				})
			);
			await this.definition.executor(msg, args, support);
		} catch (e) {
			if (e instanceof UserError) {
				logger.verbose(
					JSON.stringify({
						channel: msg.channelId,
						message: msg.id,
						user: msg.author,
						command: this.definition.name,
						error: e.message
					})
				);
				await msg.reply(e.message).catch(logger.error);
				return;
			}
			logger.error(e); // internal error
		}
	}
}
