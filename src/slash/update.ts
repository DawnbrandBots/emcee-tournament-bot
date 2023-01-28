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
			.addStringOption(option => option.setName("name").setDescription("The new name of the tournament."))
			.addStringOption(option =>
				option.setName("description").setDescription("The new description of the tournament.")
			)
			.addNumberOption(option =>
				option.setName("capacity").setDescription("The new capacity for the tournament.").setMinValue(0)
			)
			.addBooleanOption(option =>
				option
					.setName("requirecode")
					.setDescription("Whether to require a Master Duel friend code from participants.")
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
		const requireCode = interaction.options.getBoolean("requirecode");

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
			const playerCount = tournament.decks.filter(d => d.approved).length;
			// cap 0 means uncapped
			if (capacity > 0 && playerCount > capacity) {
				await interaction.reply({
					content: `You have more players (${playerCount}) registered than the new cap. Please drop enough players then try again.`,
					ephemeral: true
				});
			}

			tournament.participantLimit = capacity;
			updated = true;
		}

		if (requireCode !== null) {
			const noCodePlayers = tournament.participants.filter(p => !p.friendCode).length;
			if (requireCode && noCodePlayers > 0) {
				await interaction.reply({
					content: `${noCodePlayers} players do not have friend codes listed. Please note that they will be grandfathered in.`,
					ephemeral: true
				});
			}
			tournament.requireFriendCode = requireCode;
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
			}\nCapacity: ${
				tournament.participantLimit === 0 ? "Uncapped" : tournament.participantLimit
			}\nFriend Code Required: ${tournament.requireFriendCode}`
		);
	}
}
