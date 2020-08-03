import Controller, { DiscordWrapper } from "./controller";
import logger from "../logger";
import { UserError } from "../errors";
import {
	getOngoingTournaments,
	findTournamentOptional,
	initTournament,
	removeRegisterMessage,
	setTournamentName,
	setTournamentDescription,
	SyncDoc,
	synchronise,
	addRegisterMessage,
	startTournament
} from "../actions";

const checkEmoji = "✅"; // TODO: Synchronise with index.ts

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
		const newDoc: SyncDoc = {
			confirmedParticipants: tournament.confirmedParticipants.map(p => p.challongeId),
			name: tournament.name,
			description: tournament.description,
			totalRounds: tournament.totalRounds
		};
		const challongeData = (await this.challonge.showTournament(tournament.challongeId, true)).tournament;
		newDoc.name = challongeData.name;
		newDoc.description = challongeData.description;
		newDoc.totalRounds = challongeData.swiss_rounds;
		if (challongeData.participants) {
			newDoc.confirmedParticipants = challongeData.participants.map(p => p.participant.id);
		}
		await synchronise(tournament.challongeId, newDoc);
		logger.verbose(`Tournament ${tournament.challongeId} synchronised to remote by ${discord.currentUser().id}`);
	}

	private async openRegistrationInChannel(
		discord: DiscordWrapper,
		channelId: string,
		name: string,
		desc: string
	): Promise<void> {
		await discord.sendChannelMessage(
			channelId,
			`**New Tournament Open: ${name}**\n${desc}\nClick the ${checkEmoji} below to sign up!`
		);
		// TODO: React with the check emoji
		// TODO: Save the message ID to the database, currently requires the ID which the wrapper does not return
	}

	@Controller.Arguments("challongeId")
	async open(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		const channels = tournament.publicChannels;
		if (channels.length < 1) {
			throw new UserError(
				"You must register at least one public announcement channel before opening a tournament for registration!"
			);
		}
		await Promise.all(
			channels.map(c => this.openRegistrationInChannel(discord, c, tournament.name, tournament.description))
		);
		logger.verbose(`Tournament ${tournament.challongeId} opened for registration by ${discord.currentUser().id}.`);
	}

	private async warnClosedParticipant(discord: DiscordWrapper, participant: string, name: string): Promise<void> {
		await discord.sendDirectMessage(
			participant,
			`Sorry, the ${name} tournament you registered for has started, and you had not submitted a valid decklist, so you have been dropped.
				If you think this is a mistake, contact the tournament host.`
		);
	}

	@Controller.Arguments("challongeId")
	async start(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		if (tournament.confirmedParticipants.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		await this.challonge.startTournament(tournament.challongeId, {});
		const tournData = await this.challonge.showTournament(tournament.challongeId);
		const removedIDs = await startTournament(
			tournament.challongeId,
			discord.currentUser().id,
			tournData.tournament.swiss_rounds
		);
		await Promise.all(removedIDs.map(i => this.warnClosedParticipant(discord, i, tournament.name)));
		const messages = tournament.registerMessages;
		// TODO: Delete registration messages
		// TODO: Start first round using RoundController#next
		logger.verbose(`Tournament ${tournament.challongeId} commenced by ${discord.currentUser().id}.`);
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
