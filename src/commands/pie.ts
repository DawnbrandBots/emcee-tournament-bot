import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "pie",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const csv = await support.tournamentManager.generatePieChart(id);
		await msg.reply(`Archetype counts for Tournament ${id} are attached.`, csv);
	}
};

export default command;
