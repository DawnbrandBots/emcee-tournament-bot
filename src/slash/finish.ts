import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, roleMention, SlashCommandBuilder } from "discord.js";
import { TournamentStatus } from "../database/interface";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { send } from "../util/discord";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class FinishCommand extends AutocompletableCommand {
	#logger = getLogger("command:finish");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("finish")
			.setDescription("Finalise and close a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		tournament.status = TournamentStatus.COMPLETE;
		await tournament.save();
		const role = await interaction.guild.roles.fetch(tournament.participantRole);

		if (tournament.publicChannel && role) {
			await send(
				interaction.client,
				tournament.publicChannel,
				`${tournament.name} has concluded! Thank you all for playing! ${roleMention(role.id)}`
			);
		}

		await role?.delete();

		await interaction.reply(`${tournament.name} successfully concluded`);
	}
}
