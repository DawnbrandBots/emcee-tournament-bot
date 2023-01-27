import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";
import * as csv from "@fast-csv/format";

export class CsvCommand extends AutocompletableCommand {
	#logger = getLogger("command:csv");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("csv")
			.setDescription("Generate a CSV of participant details.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption) // TODO: format option for pie/players
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const themes = tournament.participants
			.filter(p => p.deck?.approved)
			.map(p => p.deck?.label || "No theme")
			.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
		const file = await csv.writeToBuffer([["Theme", "Count"], ...themes.entries()]);

		await interaction.reply({
			content: `A list of deck themes in ${tournament.name} with their counts is attached.`,
			files: [{ attachment: file, name: `${tournament.name}.csv` }]
		});
	}
}
