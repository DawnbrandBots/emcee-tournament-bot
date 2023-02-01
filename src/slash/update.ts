import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import {
	authenticateHost,
	autocompleteTournament,
	checkParticipantCap,
	printPlayerCap,
	tournamentOption
} from "./database";

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
					.setName("require-code")
					.setDescription("Whether to require a Master Duel friend code from participants.")
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
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName },
			relations: ["participants"]
		});

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		let replyKey: "reply" | "followUp" = "reply";

		const name = interaction.options.getString("name");
		const description = interaction.options.getString("description");
		const rawCap = interaction.options.getNumber("capacity");
		const requireCode = interaction.options.getBoolean("require-code");

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
			// cap 0 means uncapped
			if (!checkParticipantCap(tournament, capacity, true)) {
				await interaction[replyKey](
					`You have more players (${
						tournament.participants.filter(p => !!p.deck).length
					}) registered than the new cap. Please drop enough players then try again.`
				);
				// want to update the rest and likely add more replies
				replyKey = "followUp";
			}

			tournament.participantLimit = capacity;
			updated = true;
		}

		if (requireCode !== null) {
			const noCodePlayers = tournament.participants.filter(p => !p.friendCode).length;
			if (requireCode && noCodePlayers > 0) {
				await interaction[replyKey]({
					content: `${noCodePlayers} players do not have friend codes listed. Please note that they will be grandfathered in.`,
					ephemeral: true
				});
				replyKey = "followUp";
			}
			tournament.requireFriendCode = requireCode;
			updated = true;
		}

		if (!updated) {
			await interaction[replyKey](`You must provide at least one detail to update a tournament.`);
			return;
		}

		await tournament.save();

		await interaction[replyKey](
			`Tournament updated with the following details:\nName: ${tournament.name}\nDescription: ${
				tournament.description
			}\nCapacity: ${printPlayerCap(tournament)}\nFriend Code Required: ${tournament.requireFriendCode}`
		);
	}
}
