import Controller, { DiscordWrapper } from "./controller";
import { UserError } from "../errors";
import RoleProvider from "../discord/role";

export default class RoundController extends Controller {
	@Controller.Arguments("challongeId")
	async next(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId] = args[0];
		const tournament = await this.getTournament(discord, challongeId);
		// TODO: use factory
		const roleProvider = new RoleProvider(`MC-Tournament-${challongeId}`, 0xe67e22);
		const role = await roleProvider.get(discord.currentServer());
		await this.sendChannels(discord, tournament.publicChannels, `<@&${role}>`);
		// TODO: implement
	}

	@Controller.Arguments("challongeId", "score") // plus @mention-user
	async score(discord: DiscordWrapper, args: string[]): Promise<void> {
		const [challongeId, score] = args;
		const mentionedUser = discord.mentions()[0]?.id;
		if (mentionedUser === undefined) {
			throw new UserError("Must provide an @mention for the winner!");
		}
		// TODO: implement
	}
}
