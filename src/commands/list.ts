import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "list",
	requiredArgs: [],
	executor: async (message, args, support) => {
		void args;
		await support.discord.authenticateTO(message);
		const list = await support.tournamentManager.listTournaments();
		await message.reply(`\`\`\`\n${list}\`\`\``);
	}
};

export default command;
