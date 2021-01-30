import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";
import { reply } from "../util/reply";

const logger = getLogger("command:removebye");

const command: CommandDefinition = {
	name: "removebye",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Mirror of addbye
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const player = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removebye",
				mention: player,
				event: "attempt"
			})
		);
		const byes = await support.tournamentManager.removeBye(id, player);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "removebye",
				mention: player,
				event: "success"
			})
		);
		const tag = (id: string): string => `${support.discord.mentionUser(id)} (${support.discord.getUsername(id)})`;
		const names = byes.map(tag).join(", ");
		await reply(msg, `Bye removed for Player ${tag(player)} in Tournament ${id}!\nAll byes: ${names}`);
	}
};

export default command;
