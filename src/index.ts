import { prefix } from "./config/config.json";
import { challongeToken, challongeUsername, postgresqlUrl } from "./config/env";
import { initializeBehaviours } from "./CommandHandler";
import { DatabaseInterface } from "./database/interface";
import { initializeDatabase as initializePostgres } from "./database/postgres";
import { initializeCardArray } from "./deck/deck";
import { DiscordWrapperEris } from "./discord/eris";
import { DiscordInterface } from "./discord/interface";
import { TournamentManager } from "./TournamentManager";
import { WebsiteWrapperChallonge } from "./website/challonge";
import { WebsiteInterface } from "./website/interface";

(async () => {
	const wrapper = await initializePostgres(postgresqlUrl);
	const database = new DatabaseInterface(wrapper);

	await initializeCardArray();

	const challonge = new WebsiteWrapperChallonge(challongeUsername, challongeToken);
	const website = new WebsiteInterface(challonge);

	const eris = new DiscordWrapperEris();
	const discord = new DiscordInterface(eris);

	const tournamentManager = new TournamentManager(discord, database, website);
	await tournamentManager.loadTimers();
	await tournamentManager.loadGuides();
	initializeBehaviours(prefix, discord, tournamentManager);
})();
