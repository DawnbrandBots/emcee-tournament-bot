import { CommandDefinition } from "../Command";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:open");

const command: CommandDefinition = {
	name: "open",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		const [id] = args;
		const tournament = await support.database.authenticateHost(id, msg.author.id, msg.guildId);
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "open",
				event: "attempt"
			})
		);
		const channels = tournament.publicChannels;
		if (channels.length < 1) {
			throw new UserError(
				"You must register at least one public announcement channel before opening a tournament for registration!"
			);
		}
		for (const channel of channels) {
			const register = await support.discord.sendMessage(
				channel,
				`__Registration now open for **${tournament.name}**!__\n${tournament.description}\n__Click the ✅ below to sign up!__`
			);
			await support.database.openRegistration(id, msg.channelId, msg.id);
			await register.react("✅");
		}
		for (const channel of tournament.privateChannels) {
			await support.discord.sendMessage(channel, support.templater.format("open", id));
		}
		logger.verbose(
			JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "open",
				event: "success"
			})
		);
		await msg.reply(`**${tournament.name}** opened for registration!`);
	}
};

export default command;
