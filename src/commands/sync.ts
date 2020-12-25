import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "sync",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		await support.tournamentManager.syncTournament(id);
		await msg.reply(`Tournament ${id} database successfully synchronised with remote website.`);
	}
};

export default command;
