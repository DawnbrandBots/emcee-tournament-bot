import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "round",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg);
		await support.tournamentManager.nextRound(id);
		await msg.reply(`New round successfully started for Tournament ${id}.`);
	}
};

export default command;
