import * as csv from "@fast-csv/format";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { username } from "../util/discord";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";
import { formatFriendCode } from "./open";

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

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		await interaction.deferReply();
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName },
			relations: { decks: { participant: true } }
		});

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const pie = interaction.options.getString("type", true) === "Pie Chart";

		let file: Buffer;

		if (pie) {
			const themes = tournament.decks
				.filter(d => d.approved)
				.map(d => d.label || "No theme")
				.reduce((map, theme) => map.set(theme, (map.get(theme) || 0) + 1), new Map<string, number>());
			const sortedDescending = [...themes.entries()].sort(([, a], [, b]) => b - a);
			file = await csv.writeToBuffer([["Theme", "Count"], ...sortedDescending]);
		} else {
			const players = tournament.decks
				.filter(d => d.approved)
				.map(async deck => {
					const tag = (await username(interaction.client, deck.discordId)) || deck.discordId;
					return {
						Player: tag,
						Theme: deck.label || "No theme",
						"In-Game Name": deck.participant.ign || tag,
						"Friend Code": deck.participant.friendCode
							? formatFriendCode(deck.participant.friendCode)
							: "No friend code"
					};
				});
			file = await csv.writeToBuffer(await Promise.all(players), { headers: true });
		}

		await interaction.editReply({
			content: `A list of ${pie ? "deck themes" : "players"} in ${tournament.name} with their ${
				pie ? "counts" : "deck themes"
			} is attached.`,
			files: [{ attachment: file, name: `${tournament.name}.csv` }]
		});
	}
}
