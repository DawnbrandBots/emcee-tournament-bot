import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class CapacityCommand extends AutocompletableCommand {
	#logger = getLogger("command:capacity");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("update")
			.setDescription("Update the details of a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.addNumberOption(option =>
				option
					.setName("capacity")
					.setDescription("The new capacity fpr the tournament.")
					.setRequired(true)
					.setMinValue(0)
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

		// enforce integer cap
		const capacity = Math.floor(interaction.options.getNumber("capacity", true));
		const playerCount = tournament.participants.filter(p => p.deck?.approved).length;
		// cap 0 means uncapped
		if (capacity > 0 && playerCount > capacity) {
			await interaction.reply(
				`You have more players (${playerCount}) registered than the new cap. Please drop enough players then try again.`
			);
			return;
		}

		tournament.participantLimit = capacity;

		await tournament.save();
		if (capacity === 0) {
			await interaction.reply(`Tournament ${tournament.name} updated with an unlimited capcity of players.`);
			return;
		}
		await interaction.reply(`Tournament ${tournament.name} updated with a capacity of ${capacity} players.`);
	}
}
