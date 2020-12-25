import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "forcedrop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const player = support.discord.getMentionedUser(msg);
		await support.tournamentManager.dropPlayer(id, player, true);
		const name = support.discord.getUsername(player);
		await msg.reply(`Player ${name} successfully dropped from Tournament ${id}.`);
	}
};

export default command;
