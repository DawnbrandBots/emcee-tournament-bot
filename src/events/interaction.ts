import { time } from "@discordjs/builders";
import { Interaction } from "discord.js";
import { CommandSupport } from "../Command";
import { parseTime } from "../round";
import { PersistentTimer } from "../timer";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("interaction");

export function makeHandler({ organiserRole, timeWizard }: CommandSupport) {
	return async function interactionCreate(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand() || !interaction.inCachedGuild() || interaction.commandName !== "timer") {
			return;
		}
		// Should be replaced by the built-in system
		const role = await organiserRole.get(interaction.guild);
		if (!interaction.member.roles.cache.has(role)) {
			logger.verbose(`Rejected /timer attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
			return;
		}
		// Main body, analogous to a simplified mc!round
		const duration = interaction.options.getString("duration", true);
		const finalMessage = interaction.options.getString("final_message", true);
		logger.verbose(`/timer: ${interaction.guildId} ${interaction.user} ${duration} ${finalMessage}`);
		try {
			const timerMinutes = parseTime(duration);
			const end = new Date(Date.now() + timerMinutes * 60 * 1000);
			logger.info(`/timer: creating timer that ends at ${end}`);
			await interaction.reply(`Creating timer that ends at ${time(end)} (${time(end, "R")}).`);
			await PersistentTimer.create(
				timeWizard.delegate,
				end,
				interaction.channelId,
				finalMessage,
				5 // update every 5 seconds, matches mc!round
			);
		} catch (error) {
			if (error instanceof UserError) {
				await interaction.reply({ content: error.message, ephemeral: true });
			} else {
				logger.error(error);
				await interaction.reply({ content: "Something went wrong!", ephemeral: true });
			}
		}
	};
}
