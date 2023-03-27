import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { OrganiserRoleProvider } from "../role/organiser";
import { SlashCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";

export class CreateCommand extends SlashCommand {
	#logger = getLogger("command:create");

	constructor(private organiserRole: OrganiserRoleProvider) {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("create")
			.setDescription("Create a new tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(option =>
				option.setName("name").setDescription("The name of the tournament.").setRequired(true)
			)
			.addStringOption(option =>
				option.setName("description").setDescription("A description of the tournament.").setRequired(true)
			)
			.addIntegerOption(option =>
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

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		// Should be replaced by the built-in system
		const toRole = await this.organiserRole.get(interaction.guild);
		if (!interaction.member.roles.cache.has(toRole)) {
			this.#logger.verbose(`Rejected /create attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
			return;
		}

		const name = interaction.options.getString("name", true);
		const description = interaction.options.getString("description", true);
		const capacity = interaction.options.getNumber("capacity") || 0;
		const requireCode = interaction.options.getBoolean("requirecode") || false;
		const tournament = new ManualTournament();
		// compared to challonge tournaments, tournamentId autoincrements
		tournament.name = name;
		tournament.description = description;
		tournament.owningDiscordServer = interaction.guild.id;
		tournament.hosts = [interaction.user.id];
		tournament.participantLimit = capacity;
		tournament.requireFriendCode = requireCode;

		const playerRole = await interaction.guild.roles.create({
			name: `${tournament.name} Participant`,
			color: 0xe67e22,
			reason: `Automatically created by Emcee for ${tournament.name}`
		});

		tournament.participantRole = playerRole.id;

		await tournament.save();

		await interaction.reply(
			`Tournament ${name} created! For future commands, refer to this tournament by its name \`${name}\` using auto-complete.`
		);
	}
}
