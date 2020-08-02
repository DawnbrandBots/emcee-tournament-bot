import logger from "../logger";
import Controller, { SendMessageFunction } from "./controller";
import { getOngoingTournaments, findTournamentOptional, initTournament } from "../actions";
import { UserError } from "../errors";

export default class TournamentController extends Controller {
	async help(sendMessage: SendMessageFunction): Promise<void> {
		await sendMessage(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	}

	async list(sendMessage: SendMessageFunction): Promise<void> {
		const tournaments = await getOngoingTournaments();
		if (tournaments.length === 0) {
			await sendMessage("There are no active tournaments!");
		} else {
			await sendMessage(
				tournaments
					.map(
						t =>
							`ID: \`${t.challongeId}\`|Name: \`${t.name}\`|Status: \`${t.status}\`|Players: ${t.confirmedParticipants.length}`
					)
					.join("\n")
			);
		}
	}

	async create(
		sendMessage: SendMessageFunction,
		name: string,
		description: string,
		host: string,
		server: string
	): Promise<void> {
		if (name.length === 0 || description.length === 0) {
			throw new UserError("You must provide a valid tournament name and description!");
		}

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
		await sendMessage(
			`Tournament ${name} created! You can find it at https://challonge.com/${url}. For future commands, refer to this tournament by the id \`${url}\``
		);
	}

	async update(
		sendMessage: SendMessageFunction,
		challongeId: string,
		name: string,
		description: string
	): Promise<void> {
		return;
	}

	async challongeSync(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async open(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async start(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async cancel(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}

	async delete(sendMessage: SendMessageFunction, challongeId: string): Promise<void> {
		return;
	}
}
