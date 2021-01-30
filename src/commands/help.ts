import { CommandDefinition } from "../Command";
import { reply } from "../util/reply";

const command: CommandDefinition = {
	name: "help",
	requiredArgs: [],
	executor: async message => {
		await reply(
			message,
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	}
};

export default command;
