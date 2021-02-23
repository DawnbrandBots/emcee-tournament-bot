import { CommandDefinition } from "../Command";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:list");

const command: CommandDefinition = {
	name: "list",
	requiredArgs: [],
	executor: async (msg, args, support) => {
		void args;
		await support.organiserRole.authorise(msg);
		// This log may be meaningless because we perform no parameter processing
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "list",
				event: "attempt"
			})
		);
		const list = await support.database.getActiveTournaments(msg.guildID || "private");
		const text = list
			.map(t => `ID: ${t.id}|Name: ${t.name}|Status: ${t.status}|Players: ${t.players.length}`)
			.join("\n");
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				command: "list",
				event: "success"
			})
		);
		if (text.length === 0) {
			await reply(msg, "There are no open tournaments you have access to!");
		} else {
			await reply(msg, `\`\`\`\n${text}\`\`\``);
		}
	}
};

export default command;
