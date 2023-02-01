import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	EmbedField,
	SlashCommandBuilder
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, printPlayerCap, tournamentOption } from "./database";

export class InfoCommand extends AutocompletableCommand {
	#logger = getLogger("command:info");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("info")
			.setDescription("Check the details of a tournament.")
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

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const fields: EmbedField[] = [
			{
				name: ":ticket: Capacity",
				value: printPlayerCap(tournament),
				inline: true
			},
			{
				name: ":tickets: Registered",
				value: `**${tournament.decks.filter(d => d.approved).length}** participants`,
				inline: true
			},
			{ name: ":hourglass: Status", value: tournament.status, inline: true }
		];

		const hosts = tournament.hosts.map(snowflake => `<@${snowflake}>`).join(" ");
		fields.push({ name: ":smile: Hosts", value: hosts, inline: true });
		const embed = new EmbedBuilder()
			.setTitle(`**${tournament.name}**`)
			.setDescription(tournament.description)
			.setFields(fields)
			.setFooter({ text: "Tournament details as of request time" });
		await interaction.reply({ embeds: [embed] });
	}
}
