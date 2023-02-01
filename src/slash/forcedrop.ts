import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	chatInputApplicationCommandMention,
	ChatInputCommandInteraction,
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
	UserContextMenuCommandInteraction
} from "discord.js";
import { ContextCommand } from "../ContextCommand";
import { ManualParticipant, ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, dropPlayer, tournamentOption } from "./database";

export class ForceDropSlashCommand extends AutocompletableCommand {
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

		const user = interaction.options.getUser("player", true);
		const player = tournament.participants.find(p => (p.discordId = user.id));
		if (!player) {
			await interaction.reply({
				content: `That player is not in the tournament.`,
				ephemeral: true
			});
			return;
		}

		const member = await interaction.guild.members.fetch({ user: user });
		await dropPlayer(tournament, player, member, interaction);
	}
}

export class ForceDropContextCommand extends ContextCommand {
	#logger = getLogger("command:forcedrop");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new ContextMenuCommandBuilder().setName("Force Drop").setType(ApplicationCommandType.User).toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: UserContextMenuCommandInteraction<"cached">): Promise<void> {
		// more useful than user since we need to manage roles, still has the id
		const member = interaction.targetMember;

		const players = await ManualParticipant.find({ where: { discordId: member.id }, relations: ["tournament"] });

		if (players.length < 1) {
			await interaction.reply({ content: `That user is not in any tournaments.`, ephemeral: true });
			return;
		}

		if (players.length > 1) {
			if (!interaction.guild.commands.cache.size) {
				await interaction.guild.commands.fetch();
			}
			const id = interaction.guild.commands.cache.find(command => command.name === "forcedrop")?.id || "";
			const mention = chatInputApplicationCommandMention("forcedrop", id);
			await interaction.reply({
				content: `That user is in multiple tournaments. Use ${mention} to specify.`,
				ephemeral: true
			});
			return;
		}

		const player = players[0];

		const tournament = player.tournament;

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		await dropPlayer(tournament, player, member, interaction);
	}
}
