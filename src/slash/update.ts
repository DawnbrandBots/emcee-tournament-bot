import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class UpdateCommand extends AutocompletableCommand {
	#logger = getLogger("command:update");

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
			.addStringOption(option => option.setName("name").setDescription("The name of the tournament."))
			.addStringOption(option => option.setName("description").setDescription("A description of the tournament."))
			.addNumberOption(option =>
				option.setName("capacity").setDescription("The new capacity for the tournament.").setMinValue(0)
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

		const name = interaction.options.getString("name");
		const description = interaction.options.getString("description");
		const rawCap = interaction.options.getNumber("capacity");

		let updated = false;

		if (name) {
			tournament.name = name;
			updated = true;
		}
		if (description) {
			tournament.description = description;
			updated = true;
		}

		if (rawCap) {
			// enforce integer cap
			const capacity = Math.floor(rawCap);
			const playerCount = tournament.participants?.filter(p => p.deck?.approved).length || 0;
			// cap 0 means uncapped
			if (capacity > 0 && playerCount > capacity) {
				await interaction.reply(
					`You have more players (${playerCount}) registered than the new cap. Please drop enough players then try again.`
				);
			}

			tournament.participantLimit = capacity;
			updated = true;
		}
		if (!updated) {
			await interaction.reply(`You must provide at least one detail to update a tournament.`);
			return;
		}

		await tournament.save();

		await interaction.reply(
			`Tournament updated with the following details:\nName: ${tournament.name}\nDescription: ${
				tournament.description
			}\nCapacity: ${tournament.participantLimit === 0 ? "Uncapped" : tournament.participantLimit}`
		);
	}
}
