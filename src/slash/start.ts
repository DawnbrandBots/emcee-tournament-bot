import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { TournamentStatus } from "../database/interface";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class StartCommand extends AutocompletableCommand {
	#logger = getLogger("command:start");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("start")
			.setDescription("Close registration and prepare to commence a tournament.")
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
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		tournament.status = TournamentStatus.IPR;

		if (tournament.publicChannel) {
			const publicChannel = await interaction.client.channels.fetch(tournament.publicChannel);
			if (publicChannel && publicChannel.isTextBased()) {
				if (tournament.registerMessage) {
					const registerMessage = await publicChannel.messages.fetch(tournament.registerMessage);
					await registerMessage?.delete();
				}
				await publicChannel.send(`Registration for ${tournament.name} is now closed!`);
			}
		}
	}
}
