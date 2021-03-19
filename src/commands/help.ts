import { CommandDefinition } from "../Command";
import { helpMessage } from "../config";
import { reply } from "../util/discord";

const command: CommandDefinition = {
	name: "help",
	requiredArgs: [],
	executor: async message => {
		await reply(message, helpMessage);
	}
};

export default command;
