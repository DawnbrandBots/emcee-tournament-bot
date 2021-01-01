import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, postgresqlUrl } from "./config/env";
import { initializeBehaviours } from "./CommandHandler";
import { DatabaseInterface } from "./database/interface";
import { initializeDatabase as initializePostgres } from "./database/postgres";
import { getCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { TournamentManager } from "./TournamentManager";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

(async () => {
	const wrapper = await initializePostgres(postgresqlUrl);
	const database = new DatabaseInterface(wrapper);

	const eris = new DiscordWrapperEris();
	const discord = new DiscordInterface(eris);

	const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
	const website = new WebsiteInterface(challonge);

	const tournamentManager = new TournamentManager(discord, database, website);

	await getCardArray();
	initializeBehaviours(prefix, discord, tournamentManager);
})();
