import { CommandDefinition } from "../Command";
import { prettyPrint } from "../deck/discordDeck";
import { getLogger } from "../util/logger";

const logger = getLogger("command:deck");

const command: CommandDefinition = {
	name: "deck",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const player = support.discord.getMentionedUser(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "deck",
				mention: player,
				event: "attempt"
			})
		);
		const deck = await support.tournamentManager.getPlayerDeck(id, player);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "deck",
				mention: player,
				event: "retrieve"
			})
		);
		const name = support.discord.getUsername(player);
		const [message, attachment] = prettyPrint(deck, `${name}.ydk`);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author,
				command: "deck",
				mention: player,
				event: "success"
			})
		);
		await msg.reply(message, attachment);
	}
};

export default command;
