import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "dump",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		const csv = await support.tournamentManager.generateDeckDump(id);
		await msg.reply(`Player decklists for Tournament ${id} is attached.`, csv);
	}
};

export default command;
