import { CommandDefinition } from "../Command";
import { firstMentionOrFail, reply } from "../util/discord";
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
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "deck",
				mention: player,
				event: "attempt"
			})
		);
		const playerData = await support.database.getConfirmedPlayer(player, id);
		const deck = support.decks.getDeck(playerData.deck);
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
		const response = support.decks.prettyPrint(
			deck,
			`${msg.mentions[0].username}.${msg.mentions[0].discriminator}.ydk`
		);
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
		await reply(msg, ...response);
	}
};

export default command;
