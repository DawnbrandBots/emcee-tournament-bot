import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder,
	userMention
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { TournamentStatus } from "../database/interface";
import { OrganiserRoleProvider } from "../role/organiser";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";

export class HostCommand extends AutocompletableCommand {
	#logger = getLogger("command:host");

	constructor(private organiserRole: OrganiserRoleProvider) {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const tournamentOption = new SlashCommandStringOption()
			.setName("tournament")
			.setDescription("The name of the tournament to edit.")
			.setAutocomplete(true);
		const addSubcommand = new SlashCommandSubcommandBuilder()
			.setName("add")
			.setDescription("Add a host to the tournament.")
			.addStringOption(tournamentOption)
			.addUserOption(option => option.setName("user").setDescription("The user to add as host."));
		const removeSubcommand = new SlashCommandSubcommandBuilder()
			.setName("remove")
			.setDescription("Remove a host from the tournament.")
			.addStringOption(tournamentOption)
			.addUserOption(option => option.setName("user").setDescription("The host to remove."));
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

	override async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}
		const partialName = interaction.options.getFocused();
		const owningDiscordServer = interaction.guildId;
		const tournaments = await ManualTournament.find({
			where: [
				{ owningDiscordServer, status: TournamentStatus.IPR },
				{ owningDiscordServer, status: TournamentStatus.PREPARING }
			]
		});
		// can we do this natively with .find? should match all for blank input
		const matchingTournaments = tournaments
			.filter(t => t.name.includes(partialName))
			.slice(0, 25)
			.map(t => {
				return { name: t.name, value: t.name };
			});
		await interaction.respond(matchingTournaments);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });
		const host = interaction.options.getUser("user", true);

		if (tournament.owningDiscordServer !== interaction.guildId) {
			await interaction.reply({ content: `That tournament isn't in this server.`, ephemeral: true });
			return;
		}
		if (!tournament.hosts.includes(interaction.user.id)) {
			this.#logger.verbose(`Rejected /create attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
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
		if (!tournament.hosts.includes(host.id)) {
			await interaction.reply({ content: `That user is not a host.`, ephemeral: true });
			return;
		}
		tournament.hosts.push(host.id);
		await tournament.save();
		await interaction.reply({
			content: `${userMention(host.id)} has been removed as a host from ${tournament.name}!`
		});
	}
}
