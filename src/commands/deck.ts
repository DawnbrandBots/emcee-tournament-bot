import { CommandDefinition } from "../Command";
import { prettyPrint } from "../deck/discordDeck";
import { firstMentionOrFail, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:deck");

const command: CommandDefinition = {
	name: "deck",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author.id);
		const player = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "deck",
				mention: player,
				event: "attempt"
			})
		);
		const deck = await support.tournamentManager.getPlayerDeck(id, player);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "deck",
				mention: player,
				event: "retrieve"
			})
		);
		const name = support.discord.getUsername(player);
		const [message, attachment] = prettyPrint(deck, `${name}.ydk`);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "deck",
				mention: player,
				event: "success"
			})
		);
		await reply(msg, message, attachment);
	}
};

export default command;
