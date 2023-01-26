import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	userMention
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import {
	authenticateHost,
	autocompleteTournament,
	awaitDeckValidationButtons,
	generateDeckValidateButtons,
	tournamentOption
} from "./database";

export class DeckCommand extends AutocompletableCommand {
	#logger = getLogger("command:deck");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("deck")
			.setDescription("Check and validate the contents of a player's deck.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.addUserOption(option =>
				option.setName("player").setDescription("The player to display their deck.").setRequired(true)
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
		if (!interaction.inCachedGuild()) {
			return;
		}
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const user = interaction.options.getUser("player", true);
		const player = tournament.participants.find(p => (p.discordId = user.id));
		if (!player) {
			await interaction.reply({
				content: `That player is not in the tournament.`,
				ephemeral: true
			});
			return;
		}

		if (!player.deck) {
			await interaction.reply({
				content: `That player has not submitted a deck yet.`,
				ephemeral: true
			});
			return;
		}
		let outMessage = `__**${userMention(user.id)}'s deck**__:`;
		if (player.deck.label) {
			outMessage += `\n**Theme**: ${player.deck.label}`;
		}
		outMessage += `\n${player.deck.content}`;
		const row = generateDeckValidateButtons();
		const response = await interaction.reply({ content: outMessage, fetchReply: true, components: [row] });
		// errors handled by internal callbacks
		awaitDeckValidationButtons(interaction, response, tournament, this.logger, player.deck);
	}
}
