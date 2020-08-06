import Controller, { DiscordWrapper, RoleProviderFactory } from "./controller";
import { UserError } from "../errors";
import logger from "../logger";
import { Challonge } from "../challonge";

export default class RoundController extends Controller {
	protected getRoleProvider: RoleProviderFactory;

	constructor(challonge: Challonge, getRoleProvider: RoleProviderFactory) {
		super(challonge);
		this.getRoleProvider = getRoleProvider;
	}

	@Controller.Arguments("challongeId")
	async next(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId] = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		const roleProvider = this.getRoleProvider(challongeId);
		const round = 0;
		await Promise.all(
			tournament.publicChannels.map(async id => {
				const role = await roleProvider.get(discord.getServer(id));
				await discord.sendChannelMessage(id, `Round ${round} of ${tournament.name} has begun! <@&${role}>\nPairings: https://challonge.com/${challongeId}`)
			})
		);
		// TODO: implement
		// logger.verbose(`Tournament ${this.id} moved to round ${round} by ${host}.`);
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
