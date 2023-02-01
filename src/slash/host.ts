import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	userMention
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class HostCommand extends AutocompletableCommand {
	#logger = getLogger("command:host");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const addSubcommand = new SlashCommandSubcommandBuilder()
			.setName("add")
			.setDescription("Add a host to the tournament.")
			.addStringOption(tournamentOption)
			.addUserOption(option =>
				option.setName("user").setDescription("The user to add as host.").setRequired(true)
			);
		const removeSubcommand = new SlashCommandSubcommandBuilder()
			.setName("remove")
			.setDescription("Remove a host from the tournament.")
			.addStringOption(tournamentOption)
			.addUserOption(option => option.setName("user").setDescription("The host to remove.").setRequired(true));
		return new SlashCommandBuilder()
			.setName("host")
			.setDescription("Edit the hosts of a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addSubcommand(addSubcommand)
			.addSubcommand(removeSubcommand)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });
		const host = interaction.options.getUser("user", true);

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const mode = interaction.options.getSubcommand(true);
		if (mode === "add") {
			if (tournament.hosts.includes(host.id)) {
				await interaction.reply({ content: `That user is already a host.`, ephemeral: true });
				return;
			}
			tournament.hosts.push(host.id);
			await tournament.save();
			await interaction.reply({
				content: `${userMention(host.id)} has been added as a host to ${tournament.name}!`
			});
			return;
		}
		// if (mode === "remove")
		// use index instead of includes because we need to splice it later
		const hostIndex = tournament.hosts.indexOf(host.id);
		if (hostIndex === -1) {
			await interaction.reply({ content: `That user is not a host.`, ephemeral: true });
			return;
		}
		if (tournament.hosts.length < 2) {
			await interaction.reply({ content: `You cannot remove the last host from a tournament.`, ephemeral: true });
			return;
		}
		tournament.hosts.splice(hostIndex, 1);
		await tournament.save();
		await interaction.reply({
			content: `${userMention(host.id)} has been removed as a host from ${tournament.name}!`
		});
	}
}
