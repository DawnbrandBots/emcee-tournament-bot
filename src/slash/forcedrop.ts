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
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class ForceDropCommand extends AutocompletableCommand {
	#logger = getLogger("command:forcedrop");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("forcedrop")
			.setDescription("Remove a player from a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.addUserOption(option => option.setName("player").setDescription("The player to remove.").setRequired(true))
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

		// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
		// TODO: fix above?
		const member = await interaction.guild.members.fetch({ user: user });
		await member.roles.remove(tournament.participantRole);

		await player.remove();
		await user.send(`You have been dropped from ${tournament.name} by the hosts.`);
		await interaction.reply(`${userMention(user.id)} has been dropped from ${tournament.name}.`);
	}
}
