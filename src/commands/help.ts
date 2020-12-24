import { CommandDefinition } from "../Command";

const command: CommandDefinition = {
	name: "help",
	requiredArgs: [],
	executor: async message => {
		await message.reply(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	}
};

export default command;
