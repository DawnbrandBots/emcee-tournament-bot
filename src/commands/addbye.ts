import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "addbye",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		await support.tournamentManager.authenticateHost(id, msg.author);
		const player = support.discord.getMentionedUser(msg);
		const byes = await support.tournamentManager.registerBye(id, player);
		const names = byes.map(b => `${support.discord.mentionUser(b)} (${support.discord.getUsername(b)})`);
		await msg.reply(
			`Bye registered for Player ${support.discord.mentionUser(player)} (${support.discord.getUsername(
				player
			)}) in Tournament ${id}!\nAll byes: ${names.join(", ")}`
		);
	}
};

export default command;
