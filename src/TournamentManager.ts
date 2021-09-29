import { DatabaseWrapperPostgres } from "./database/postgres";
import { Templater } from "./templates";
import { ChallongeAPIError, TournamentNotFoundError } from "./util/errors";
import { Public } from "./util/types";
import { WebsiteWrapperChallonge } from "./website/challonge";

export type TournamentInterface = Pick<TournamentManager, "createTournament">;

export class TournamentManager implements TournamentInterface {
	constructor(
		private database: Public<DatabaseWrapperPostgres>,
		private website: WebsiteWrapperChallonge,
		private templater: Templater
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

		try {
			const web = await this.website.createTournament(name, desc, candidateUrl, topCut);
			await this.database.createTournament(hostId, serverId, web.id, name, desc, topCut);
			return [web.id, web.url, this.templater.format("create", web.id)];
		} catch (e) {
			// challonge API error message
			if (e instanceof ChallongeAPIError && e.message === "URL is already taken") {
				throw new ChallongeAPIError(url);
			}
			throw e;
		}
	}
}
