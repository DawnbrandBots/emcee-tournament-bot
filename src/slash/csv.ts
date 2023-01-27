import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";
import * as csv from "@fast-csv/format";
import { username } from "../util/discord";

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
			.addStringOption(tournamentOption)
			.addStringOption(option =>
				option
					.setName("type")
					.setDescription("The type of data to display.")
					.setRequired(true)
					.addChoices(
						{ name: "Pie Chart", value: "Pie Chart" },
						{ name: "Player List", value: "Player List" }
					)
			)
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

		const pie = interaction.options.getString("type", true) === "Pie Chart";

		let file: Buffer;

		if (pie) {
			const themes = tournament.participants
				.filter(p => p.deck?.approved)
				.map(p => p.deck?.label || "No theme")
				.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
			file = await csv.writeToBuffer([["Theme", "Count"], ...themes.entries()]);
		} else {
			const players = tournament.participants
				.filter(p => p.deck?.approved)
				.map(async player => {
					const tag = (await username(interaction.client, player.discordId)) || player.discordId;
					return {
						Player: tag,
						Theme: player.deck?.label || "No theme"
					};
				});
			file = await csv.writeToBuffer(await Promise.all(players), { headers: true });
		}

		await interaction.reply({
			content: `A list of ${pie ? "deck themes" : "players"} in ${tournament.name} with their ${
				pie ? "counts" : "deck themes"
			} is attached.`,
			files: [{ attachment: file, name: `${tournament.name}.csv` }]
		});
	}
}
