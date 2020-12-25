import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "drop",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// TODO: infer tournamentId from tournament player is in? gotta make player-facing features as simple as possible
		const [id] = args;
		await support.tournamentManager.authenticatePlayer(id, msg.author);
		await support.tournamentManager.dropPlayer(id, msg.author);
		const name = support.discord.getUsername(msg.author);
		await msg.reply(`Player ${name}, you have successfully dropped from Tournament ${id}.`);
	}
};

export default command;
