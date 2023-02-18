import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { AutocompletableCommand } from "../SlashCommand";
import { serialiseInteraction } from "../util";
import { getLogger, Logger } from "../util/logger";
import { autocompleteTournament } from "./database";

export class ReportWinCommand extends AutocompletableCommand {
	#logger = getLogger("command:report-win");

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		// Administrators can choose to enable this on a per-channel basis
		return new SlashCommandBuilder()
			.setName("report-win")
			.setDescription("Report your round win in a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addIntegerOption(option =>
				option
					.setName("table")
					.setDescription("Table assigned by tournament hosts.")
					.setRequired(true)
					.setMinValue(1)
			)
			.addUserOption(option =>
				option.setName("opponent").setDescription("Who did you play against?").setRequired(true)
			)
			.addStringOption(option =>
				option
					.setName("coin-toss")
					.setDescription("Who won the coin toss?")
					.addChoices(
						{ name: "Heads (I chose first or second)", value: "heads" },
						{ name: "Tails (opponent chose first or second)", value: "tails" }
					)
					.setRequired(true)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		this.#logger.info(serialiseInteraction(interaction, { options: interaction.options }));
		const table = interaction.options.getInteger("table", true);
		const opponent = interaction.options.getUser("opponent", true);
		const coinToss = interaction.options.getString("coin-toss", true);
		await interaction.reply(`Table ${table}: ${interaction.user} wins vs. ${opponent}. ${coinToss}`);
	}
}
