import Controller, { DiscordWrapper } from "./controller";
import logger from "../logger";
import { UserError } from "../errors";
import {
	getOngoingTournaments,
	findTournamentOptional,
	initTournament,
	removeRegisterMessage,
	setTournamentName,
	setTournamentDescription
} from "../actions";

export default class TournamentController extends Controller {
	async help(discord: DiscordWrapper): Promise<void> {
		await discord.sendMessage(
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

	@Controller.Arguments("name", "description")
	async create(discord: DiscordWrapper, args: string[]): Promise<void> {
		await discord.assertUserPrivileged();
		const [name, description] = args;
		if (name.length === 0 || description.length === 0) {
			throw new UserError("You must provide a valid tournament name and description!");
		}
		const host = discord.currentUser().id;
		const server = discord.currentServer().id;

		// generate a URL based on the name, with added numbers to prevent conflicts
		// eslint-disable-next-line prefer-template
		const baseUrl = "mc_" + name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
		let candidateUrl = baseUrl;
		for (let i = 0; await findTournamentOptional(candidateUrl); candidateUrl = baseUrl + ++i);

		// The API can still throw an error or return an unexpected response structure,
		// which will cause an exception on the destructured assignment
		const {
			tournament: { url }
		} = await this.challonge.createTournament({
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

	@Controller.Arguments("challongeId", "name", "description")
	async update(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId, name, description] = args;
		const tournament = await this.getTournament(discord, challongeId);
		await this.challonge.updateTournament(tournament.challongeId, {
			name,
			description
		});
		const oldName = tournament.name;
		await setTournamentName(tournament.id, name);
		await setTournamentDescription(tournament.id, description);
		await discord.sendMessage(
			`Tournament ${oldName} successfully updated to ${name} with the following description:\n${description}`
		);
		logger.verbose(
			`Tournament ${tournament.id} name changed to ${name} by ${discord.currentUser().username} (${
				discord.currentUser().id
			}). Description changed to ${description}`
		);
	}

	@Controller.Arguments("challongeId")
	async challongeSync(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		return;
	}

	@Controller.Arguments("challongeId")
	async open(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		return;
	}

	@Controller.Arguments("challongeId")
	async start(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		return;
	}

	@Controller.Arguments("challongeId")
	async cancel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		return;
	}

	@Controller.Arguments("challongeId")
	async delete(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		return;
	}

	async removeAnnouncement(messageId: string, channelId: string): Promise<void> {
		// TODO: deal with pending participants accordingly
		// depending on how many register messages remain
		if (await removeRegisterMessage(messageId, channelId)) {
			logger.verbose(`Registration message ${messageId} in ${channelId} deleted.`);
		}
	}
}
