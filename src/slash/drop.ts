import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	chatInputApplicationCommandMention,
	ChatInputCommandInteraction,
	SlashCommandBuilder
} from "discord.js";
import { ManualParticipant, ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticatePlayer, autocompleteTournament, dropPlayer } from "./database";

export class DropCommand extends AutocompletableCommand {
	#logger = getLogger("command:drop");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return (
			new SlashCommandBuilder()
				.setName("drop")
				.setDescription("Remove yourself from a tournament.")
				.setDMPermission(false)
				.setDefaultMemberPermissions(0)
				// explicitly recreate tournamentOption to make it optional
				.addStringOption(option =>
					option
						.setName("tournament")
						.setDescription("The name of the tournament to edit.")
						.setRequired(false)
						.setAutocomplete(true)
				)
				.toJSON()
		);
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		await interaction.deferReply();
		const tournamentName = interaction.options.getString("tournament");
		if (!tournamentName) {
			const players = await ManualParticipant.find({
				where: { discordId: interaction.user.id },
				relations: ["tournament"]
			});

			if (players.length < 1) {
				await interaction.editReply(`You are not in any tournaments.`);
				return;
			}

			if (players.length > 1) {
				if (!interaction.guild.commands.cache.size) {
					await interaction.guild.commands.fetch();
				}
				const id = interaction.guild.commands.cache.find(command => command.name === "drop")?.id || "";
				const mention = chatInputApplicationCommandMention("forcedrop", id);
				await interaction.editReply(
					`You are in multiple tournaments. Use the \`tournament\` option in ${mention} to specify.`
				);
				return;
			}

			const player = players[0];

			const tournament = player.tournament;

			await dropPlayer(tournament, player, interaction.member, interaction);
			return;
		}
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName },
			relations: ["participants"]
		});

		const player = await authenticatePlayer(tournament, interaction);

		if (!player) {
			// rejection messages handled in helper
			return;
		}
		await dropPlayer(tournament, player, interaction.member, interaction);
	}
}
