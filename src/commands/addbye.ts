import { CommandDefinition } from "../Command";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addbye");

const command: CommandDefinition = {
	name: "addbye",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const player = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "addbye",
				mention: player,
				event: "attempt"
			})
		);
		const byes = await support.tournamentManager.registerBye(id, player);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				tournament: id,
				command: "addbye",
				mention: player,
				event: "success"
			})
		);
		const tag = (id: string): string => `${support.discord.mentionUser(id)} (${support.discord.getUsername(id)})`;
		const names = byes.map(tag).join(", ");
		await msg.reply(`Bye registered for Player ${tag(player)} in Tournament ${id}!\nAll byes: ${names}`);
	}
};

export default command;
