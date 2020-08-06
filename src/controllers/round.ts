import Controller, { DiscordWrapper, RoleProviderFactory } from "./controller";
import { UserError } from "../errors";
import logger from "../logger";
import { Challonge } from "../challonge";
import RoleProvider from "../discord/role";
import { nextRound, startTournament } from "../actions";
import { TournamentDoc } from "../models";

export default class RoundController extends Controller {
	protected getRoleProvider: RoleProviderFactory;

	constructor(challonge: Challonge, getRoleProvider: RoleProviderFactory) {
		super(challonge);
		this.getRoleProvider = getRoleProvider;
	}

	private async startRound(
		discord: DiscordWrapper,
		roleProvider: RoleProvider,
		channelId: string,
		challongeId: string,
		round: number,
		name: string,
		bye?: string
	): Promise<void> {
		const role = await roleProvider.get(discord.getServer(channelId));
		let message = `Round ${round} of ${name} has begun! <@&${role}>\nPairings: https://challonge.com/${challongeId}`;
		if (bye) {
			message += `\n${this.mention(bye)} has the bye for this round.`;
		}
		await discord.sendChannelMessage(channelId, message);
	}

	private async checkBye(tournament: TournamentDoc): Promise<string | undefined> {
		// odd number of participants means a bye
		if (tournament.confirmedParticipants.length % 2 === 1) {
			const matches = await this.challonge.indexMatches(tournament.challongeId, "open");
			const players = tournament.confirmedParticipants.map(p => p.challongeId);
			for (const match of matches) {
				const i = players.indexOf(match.match.player1_id);
				if (i > -1) {
					players.splice(i);
				}
				const j = players.indexOf(match.match.player2_id);
				if (j > -1) {
					players.splice(j);
				}
			}
			if (players.length === 1) {
				const user = tournament.confirmedParticipants.find(p => p.challongeId === players[0]);
				return user?.discord;
			}
		}
		return;
	}

	@Controller.Arguments("challongeId")
	async next(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId] = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		const round = await nextRound(challongeId, discord.currentUser().id);
		if (round === -1) {
			throw new UserError(
				`Tournament ${tournament.name} is in its final round! To finish the tournament, use the \`finish\` command instead.`
			);
		}
		const openMatches = await this.challonge.indexMatches(challongeId, "open");
		await Promise.all(
			openMatches.map(m =>
				this.challonge.updateMatch(challongeId, m.match.id.toString(), {
					// eslint-disable-next-line @typescript-eslint/camelcase
					winner_id: "tie",
					// eslint-disable-next-line @typescript-eslint/camelcase
					scores_csv: "0-0"
				})
			)
		);
		const bye = await this.checkBye(tournament);
		const roleProvider = this.getRoleProvider(challongeId);
		await Promise.all(
			tournament.publicChannels.map(c =>
				this.startRound(discord, roleProvider, c, challongeId, round, tournament.name, bye)
			)
		);
		logger.verbose(
			`Tournament ${challongeId} moved to round ${round} by ${discord.currentUser().username} (${
				discord.currentUser().id
			}).`
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
		await Promise.all(
			removedIDs.map(i =>
				discord.sendDirectMessage(
					i,
					`Sorry, the ${tournament.name} tournament you registered for has started, and you had not submitted a valid decklist, so you have been dropped.
				If you think this is a mistake, contact the tournament host.`
				)
			)
		);
		await Promise.all(tournament.registerMessages.map(m => this.removeAnnouncement(discord, m.channel, m.message)));
		await this.next(discord, args); // commence first round
		logger.verbose(`Tournament ${tournament.challongeId} commenced by ${discord.currentUser().id}.`);
	}

	@Controller.Arguments("challongeId", "score") // plus @mention-user
	async score(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId, score] = args;
		const tournament = await this.getTournament(discord, challongeId);
		const mentionedUser = discord.mentions()[0]?.id;
		if (mentionedUser === undefined) {
			throw new UserError("Must provide an @mention for the winner!");
		}
		const winner = tournament.confirmedParticipants.find(p => p.discord === mentionedUser);
		if (winner === undefined) {
			throw new UserError("Must provide an @mention for the winner!");
		}
		const [winnerScore, loserScore] = score.split("-").map(parseInt);
		if (isNaN(winnerScore) || isNaN(loserScore)) {
			throw new UserError("Must provide score in the format #-#, e.g. 2-1, with the winner first!");
		}
		const matches = await this.challonge.indexMatches(tournament.challongeId, "open", winner.challongeId);
		if (matches.length === 0) {
			throw new UserError(
				`Could not find an open match involving ${this.mention(mentionedUser)} for ${tournament.name}!`
			);
		}
		const match = matches[0].match;
		let scoresCsv = `${winnerScore}-${loserScore}`;
		// swap score order if player 2 won to support winner-first where challonge expects player1-first
		if (match.player2_id === winner.challongeId) {
			scoresCsv = `${loserScore}-${winnerScore}`;
		}
		await this.challonge.updateMatch(tournament.challongeId, match.id.toString(), {
			// eslint-disable-next-line @typescript-eslint/camelcase
			winner_id: winner.challongeId,
			// eslint-disable-next-line @typescript-eslint/camelcase
			scores_csv: scoresCsv
		});
		await discord.sendMessage(`${score} win for ${this.mention(mentionedUser)} reported in ${tournament.name}!`);
		logger.verbose(
			`Tournament ${tournament.challongeId} reported ${score} win for ${mentionedUser} by ${
				discord.currentUser().username
			} (${discord.currentUser().id})`
		);
	}
}
