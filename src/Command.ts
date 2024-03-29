import { Message } from "discord.js";
import { FetchError } from "node-fetch";
import { DatabaseWrapperPostgres } from "./database/postgres";
import { DeckManager } from "./deck";
import { OrganiserRoleProvider } from "./role/organiser";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { TimeWizard } from "./timer";
import { TournamentInterface } from "./TournamentManager";
import { ChallongeAPIError, UserError } from "./util/errors";
import { getLogger } from "./util/logger";
import { Public } from "./util/types";
import { WebsiteWrapperChallonge } from "./website/challonge";

const logger = getLogger("command");

interface MatchScore {
	playerId: number;
	playerDiscord: string;
	playerScore: number;
	oppScore: number;
}

export interface CommandSupport {
	tournamentManager: TournamentInterface;
	organiserRole: OrganiserRoleProvider;
	database: Public<DatabaseWrapperPostgres>;
	challonge: WebsiteWrapperChallonge;
	scores: Map<string, Map<number, MatchScore>>;
	decks: DeckManager;
	participantRole: ParticipantRoleProvider;
	templater: Templater;
	timeWizard: TimeWizard;
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
			channel: msg.channelId,
			message: msg.id,
			user: msg.author.id,
			command: this.definition.name,
			...extra
		});
	}

	public async run(msg: Message, args: string[], support: CommandSupport): Promise<void> {
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
			// make-fetch-happen and minipass-fetch do not export their otherwise identical FetchError
			if (e instanceof ChallongeAPIError || (e as FetchError).name === "FetchError") {
				logger.warn(this.log(msg, { args }), e);
				await msg.reply(`Something went wrong with Challonge! Please try again later.`).catch(logger.error);
				return;
			}
			logger.error(this.log(msg, { args }), e); // internal error
		}
	}
}
