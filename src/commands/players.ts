import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "players",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const list = await support.tournamentManager.listPlayers(id);
		await msg.reply(`A list of players for tournament ${id} with the theme of their deck is attached.`, list);
	}
};

export default command;
