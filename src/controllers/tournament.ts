import Controller, { DiscordWrapper, RoleProviderFactory } from "./controller";
import logger from "../logger";
import { UserError } from "../errors";
import {
	getOngoingTournaments,
	findTournamentOptional,
	initTournament,
	setTournamentName,
	setTournamentDescription,
	SyncDoc,
	synchronise,
	addRegisterMessage,
	finishTournament,
	deleteTournament
} from "../actions";
import { Challonge } from "../challonge";
import RoleProvider from "../discord/role";

export default class TournamentController extends Controller {
	protected checkEmoji: string;
	protected getRoleProvider: RoleProviderFactory;

	constructor(challonge: Challonge, checkEmoji: string, getRoleProvider: RoleProviderFactory) {
		super(challonge);
		this.checkEmoji = checkEmoji;
		this.getRoleProvider = getRoleProvider;
	}

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
		challongeId: string,
		name: string,
		desc: string
	): Promise<void> {
		const messageId = await discord.sendChannelMessage(
			channelId,
			`**New Tournament Open: ${name}**\n${desc}\nClick the ${this.checkEmoji} below to sign up!`,
			this.checkEmoji
		);
		if (messageId !== "") {
			await addRegisterMessage(messageId, channelId, challongeId);
		}
	}

	@Controller.Arguments("challongeId")
	async open(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId] = args;
		const tournament = await this.getTournament(discord, challongeId);
		const channels = tournament.publicChannels;
		if (channels.length < 1) {
			throw new UserError(
				"You must register at least one public announcement channel before opening a tournament for registration!"
			);
		}
		await Promise.all(
			channels.map(id =>
				this.openRegistrationInChannel(discord, id, challongeId, tournament.name, tournament.description)
			)
		);
		logger.verbose(`Tournament ${tournament.challongeId} opened for registration by ${discord.currentUser().id}.`);
	}

	@Controller.Arguments("challongeId")
	async pause(discord: DiscordWrapper, args: string[]): Promise<void> {
		const tournament = await this.getTournament(discord, args[0]);
		await Promise.all(tournament.registerMessages.map(m => this.removeAnnouncement(discord, m.channel, m.message)));
		await Promise.all(
			tournament.publicChannels.map(c =>
				discord.sendChannelMessage(
					c,
					`Registration for ${tournament.name} has closed.\nPlease stand by for either registration to reopen or the tournament to begin.`
				)
			)
		);
		await discord.sendMessage(`Registration for ${tournament.name} successfully paused.`);
		logger.verbose(
			`Registration for ${tournament.challongeId} paused by ${discord.currentUser().username} (${
				discord.currentUser().id
			})`
		);
	}

	private async finishTournament(
		discord: DiscordWrapper,
		roleProvider: RoleProvider,
		channelId: string,
		challongeId: string,
		name: string,
		cancel = false
	): Promise<void> {
		const guild = discord.getServer(channelId);
		const role = await roleProvider.get(guild);
		const message = `${name} has ${
			cancel ? "been cancelled." : "finished!"
		} <@&${role}>\nFinal results: https://challonge.com/${challongeId}`;
		await discord.sendChannelMessage(channelId, message);
		await roleProvider.delete(guild);
	}

	@Controller.Arguments("challongeId")
	async finish(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		if (tournament.currentRound < tournament.totalRounds) {
			throw new UserError(
				`${tournament.name} must be in its final round to finish! It is currently in round ${tournament.currentRound}/${tournament.totalRounds}.`
			);
		}
		const openMatches = await this.challonge.indexMatches(challongeId, "open");
		if (openMatches.length > 0) {
			throw new UserError(`${tournament.name} cannot be finished while it still has matches open!`);
		}
		await this.challonge.finaliseTournament(challongeId, {});
		await finishTournament(challongeId, discord.currentUser().id);
		const roleProvider = this.getRoleProvider(challongeId);
		await Promise.all(
			tournament.publicChannels.map(c =>
				this.finishTournament(discord, roleProvider, c, challongeId, tournament.name)
			)
		);
		await discord.sendMessage(`Tournament ${tournament.name} successfully finished!`);
		logger.verbose(
			`Tournament ${challongeId} finished by ${discord.currentUser().username} (${discord.currentUser().id})`
		);
	}

	@Controller.Arguments("challongeId")
	async cancel(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		await finishTournament(challongeId, discord.currentUser().id);
		const roleProvider = this.getRoleProvider(challongeId);
		await Promise.all(
			tournament.publicChannels.map(c =>
				this.finishTournament(discord, roleProvider, c, challongeId, tournament.name, true)
			)
		);
		await discord.sendMessage(`Tournament ${tournament.name} successfully cancelled.`);
		logger.verbose(
			`Tournament ${challongeId} cancelled by ${discord.currentUser().username} (${discord.currentUser().id})`
		);
	}

	@Controller.Arguments("challongeId")
	async delete(discord: DiscordWrapper, args: string[]): Promise<void> {
		const challongeId = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		if (tournament.status !== "complete") {
			throw new UserError("You cannot delete a tournament that is not closed.");
		}
		await this.challonge.destroyTournament(challongeId);
		const name = tournament.name;
		await deleteTournament(challongeId, discord.currentUser().id);
		await discord.sendMessage(`Tournament ${name} deleted successfully!`);
		logger.verbose(
			`Tournament ${challongeId} deleted by ${discord.currentUser().username} (${discord.currentUser().id})`
		);
	}
}
