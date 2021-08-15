import { CommandDefinition } from "../Command";
import { helpMessage } from "../config";

const command: CommandDefinition = {
	name: "help",
	requiredArgs: [],
	executor: async message => {
		await message.reply(helpMessage);
	}
};

export default command;
