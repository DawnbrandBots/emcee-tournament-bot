import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	userMention
} from "discord.js";
import { ManualDeckSubmission, ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class QueueCommand extends AutocompletableCommand {
	#logger = getLogger("command:queue");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("queue")
			.setDescription("List players with submitted decks pending approval.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName }
		});

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const decks = await ManualDeckSubmission.find({
			where: { tournamentId: tournament.tournamentId, approved: false }
		});
		if (decks.length === 0) {
			await interaction.reply({
				content: `There are no players with pending decks in that tournament!`,
				ephemeral: true
			});
			return;
		}
		const players = decks.map(d => userMention(d.discordId));

		await interaction.reply(`${players.length} players are waiting for deck approval. List\n${players.join(", ")}`);
	}
}
