import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, SlashCommandBuilder, time } from "discord.js";
import { OrganiserRoleProvider } from "../role/organiser";
import { parseTime } from "../round";
import { SlashCommand } from "../SlashCommand";
import { PersistentTimer, TimeWizard } from "../timer";
import { UserError } from "../util/errors";
import { getLogger, Logger } from "../util/logger";

export class TimerCommand extends SlashCommand {
	#logger = getLogger("command:help");

	constructor(private organiserRole: OrganiserRoleProvider, private timeWizard: TimeWizard) {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("timer")
			.setDescription("Starts a timer in the current channel.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(option =>
				option
					.setName("duration")
					.setDescription("How long to run the timer for in the form `hh:mm` or `mm`.")
					.setRequired(true)
			)
			.addStringOption(option =>
				option
					.setName("final_message")
					.setDescription("What to send out when the timer runs out")
					.setRequired(true)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		// Should be replaced by the built-in system
		const role = await this.organiserRole.get(interaction.guild);
		if (!interaction.member.roles.cache.has(role)) {
			this.#logger.verbose(`Rejected /timer attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
			return;
		}
		// Main body, analogous to a simplified mc!round
		const duration = interaction.options.getString("duration", true);
		const finalMessage = interaction.options.getString("final_message", true);
		this.#logger.verbose(`/timer: ${interaction.guildId} ${interaction.user} ${duration} ${finalMessage}`);
		try {
			const timerMinutes = parseTime(duration);
			const end = new Date(Date.now() + timerMinutes * 60 * 1000);
			this.#logger.info(`/timer: creating timer that ends at ${end}`);
			await interaction.reply(`Creating timer that ends at ${time(end)} (${time(end, "R")}).`);
			await PersistentTimer.create(
				this.timeWizard.delegate,
				end,
				interaction.channelId,
				finalMessage,
				5 // update every 5 seconds, matches mc!round
			);
		} catch (error) {
			if (error instanceof UserError) {
				await interaction.reply({ content: error.message, ephemeral: true });
			} else {
				this.#logger.error(error);
				await interaction.reply({ content: "Something went wrong!", ephemeral: true });
			}
		}
	}
}
