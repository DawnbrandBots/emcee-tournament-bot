import logger from "../logger";
import Controller, { DiscordWrapper } from "./controller";
import { getOngoingTournaments, findTournamentOptional, initTournament } from "../actions";
import { UserError } from "../errors";

export default class TournamentController extends Controller {
	async help({ sendMessage }: DiscordWrapper): Promise<void> {
		await sendMessage(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	}

	async list(discord: DiscordWrapper): Promise<void> {
		await discord.assertUserPrivileged();
		const tournaments = await getOngoingTournaments();
		if (tournaments.length === 0) {
			await discord.sendMessage("There are no active tournaments!");
		} else {
			await discord.sendMessage(
				tournaments
					.map(
						t =>
							`ID: \`${t.challongeId}\`|Name: \`${t.name}\`|Status: \`${t.status}\`|Players: ${t.confirmedParticipants.length}`
					)
					.join("\n")
			);
		}
	}

	async create(discord: DiscordWrapper, args: string[]): Promise<void> {
		await discord.assertUserPrivileged();
		if (args.length < 2) {
			throw new UserError("Must provide both <name> | <description> arguments!")
		}
		const [name, description] = args;
		if (name.length === 0 || description.length === 0) {
			throw new UserError("You must provide a valid tournament name and description!");
		}
		const host = discord.currentUser().id;
		const server = discord.currentServerId();

		// generate a URL based on the name, with added numbers to prevent conflicts
		// eslint-disable-next-line prefer-template
		const baseUrl = "mc_" + name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
		let candidateUrl = baseUrl;
		for (let i = 0; await findTournamentOptional(candidateUrl); candidateUrl = baseUrl + ++i);

		// The API can still throw an error or return an unexpected response structure,
		// which will cause an exception on the destructured assignment
		const { tournament: { url } } = await this.challonge.createTournament({
			name,
			description,
			// eslint-disable-next-line @typescript-eslint/camelcase
			tournament_type: "swiss",
			url: candidateUrl
		});

		const tournament = await initTournament(host, server, url, name, description);
		logger.verbose(`New tournament "${url}" (${tournament.id}) created by ${host} from ${server}.`);
		await discord.sendMessage(
			`Tournament ${name} created! You can find it at https://challonge.com/${url}. For future commands, refer to this tournament by the id \`${url}\``
		);
	}

	async update(discord: DiscordWrapper, args: string[]): Promise<void> {
		await discord.assertUserPrivileged();
		// Parameters: challongeId, new name, new description
		// Check if host is organiser for tournament
		return;
	}

	private async assertChallongeArgument(discord: DiscordWrapper, args: string[]): Promise<string> {
		await discord.assertUserPrivileged();
		if (args.length < 1) {
			throw new UserError("Must provide tournament identifier!");
		}
		return args[0];
	}

	async challongeSync(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = await this.assertChallongeArgument(discord, args);
		return;
	}

	async open(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = await this.assertChallongeArgument(discord, args);
		return;
	}

	async start(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = await this.assertChallongeArgument(discord, args);
		return;
	}

	async cancel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = await this.assertChallongeArgument(discord, args);
		return;
	}

	async delete(discord: DiscordWrapper, args: string[]): Promise<void> {
		return;
	}
}
