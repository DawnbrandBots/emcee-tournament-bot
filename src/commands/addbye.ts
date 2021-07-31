import { CommandDefinition } from "../Command";
import { firstMentionOrFail, reply } from "../util/discord";
import { getLogger } from "../util/logger";

const logger = getLogger("command:addbye");

const command: CommandDefinition = {
	name: "addbye",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildID);
		const player = firstMentionOrFail(msg);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addbye",
				mention: player,
				event: "attempt"
			})
		);
		const byes = await support.database.registerBye(id, player);
		logger.verbose(
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "addbye",
				mention: player,
				event: "success"
			})
		);
		const tag = (id: string): string =>
			`${support.discord.mentionUser(id)} (${support.discord.getUsername(id, true)})`;
		const names = byes.map(tag).join(", ");
		await reply(msg, `Bye registered for Player ${tag(player)} in **${tournament.name}**!\nAll byes: ${names}`);
	}
};

export default command;
