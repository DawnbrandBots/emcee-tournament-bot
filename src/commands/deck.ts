import { CommandDefinition } from "../Command";
import { firstMentionOrFail } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:deck");

const command: CommandDefinition = {
	name: "deck",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		const player = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "deck",
				mention: player.id,
				event: "attempt"
			})
		);
		const playerData = await support.database.getConfirmedPlayer(player.id, id);
		const deck = support.decks.getDeck(playerData.deck);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "deck",
				mention: player.id,
				event: "retrieve"
			})
		);
		// d.js supports user.tag, but we don't want the # here
		const response = support.decks.prettyPrint(deck, `${player.username}.${player.discriminator}.ydk`);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				command: "deck",
				mention: player.id,
				event: "success"
			})
		);
		await msg.reply(response);
	}
};

export default command;
