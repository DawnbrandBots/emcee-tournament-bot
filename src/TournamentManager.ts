import { DatabaseWrapperPostgres } from "./database/postgres";
import { DiscordInterface, DiscordMessageLimited } from "./discord/interface";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { TimeWizard } from "./timer";
import { ChallongeAPIError, TournamentNotFoundError } from "./util/errors";
import { getLogger } from "./util/logger";
import { Public } from "./util/types";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("tournament");

export type TournamentInterface = Pick<TournamentManager, "cleanRegistration" | "createTournament">;

export class TournamentManager implements TournamentInterface {
	constructor(
		private discord: DiscordInterface,
		private database: Public<DatabaseWrapperPostgres>,
		private website: WebsiteInterface,
		private templater: Templater,
		private participantRole: ParticipantRoleProvider,
		private timeWizard: TimeWizard
	) {}

	private async checkUrlTaken(url: string): Promise<boolean> {
		try {
			await this.website.getTournament(url);
			return true;
		} catch (e) {
			if (e instanceof ChallongeAPIError) {
				// This is an error which means the name is taken, just not by Emcee.
				if (e.message === "You only have read access to this tournament") {
					return true;
				}
			} else {
				// If the error is it not being found on website, we should continue to the database check
				throw e;
			}
		}
		try {
			await this.database.getTournament(url);
			return true;
		} catch (e) {
			if (e instanceof TournamentNotFoundError) {
				return false;
			}
			throw e;
		}
	}

	public async createTournament(
		hostId: string,
		serverId: string,
		name: string,
		desc: string,
		topCut = false
	): Promise<[string, string, string]> {
		// generate a URL based on the name, with added numbers to prevent conflicts
		const baseUrl = name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
		let candidateUrl = `${baseUrl}`;
		let i = 0;
		// while a tournament with that ID exists, the URL is taken
		while (await this.checkUrlTaken(candidateUrl)) {
			candidateUrl = `${baseUrl}${i}`;
			i++;
		}

		const web = await this.website.createTournament(name, desc, candidateUrl, topCut);
		await this.database.createTournament(hostId, serverId, web.id, name, desc, topCut);
		return [web.id, web.url, this.templater.format("create", web.id)];
	}

	public async cleanRegistration(msg: DiscordMessageLimited): Promise<void> {
		await this.database.cleanRegistration(msg.channelId, msg.id);
	}
}
