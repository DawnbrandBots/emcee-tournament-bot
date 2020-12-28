import { CommandDefinition } from "../Command";
import { prettyPrint } from "../deck/discordDeck";

const command: CommandDefinition = {
	name: "deck",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const player = support.discord.getMentionedUser(msg);
		const deck = await support.tournamentManager.getPlayerDeck(id, player);
		const name = support.discord.getUsername(player);
		const [message, attachment] = prettyPrint(deck, `${name}.ydk`);
		await msg.reply(message, attachment);
	}
};

export default command;
