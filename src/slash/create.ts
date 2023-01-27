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

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		// Should be replaced by the built-in system
		const toRole = await this.organiserRole.get(interaction.guild);
		if (!interaction.member.roles.cache.has(toRole)) {
			this.#logger.verbose(`Rejected /create attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
			return;
		}

		const name = interaction.options.getString("name", true);
		const description = interaction.options.getString("description", true);
		const requireCode = interaction.options.getBoolean("requirecode") || false;
		const tournament = new ManualTournament();
		// compared to challonge tournaments, tournamentId autoincrements
		tournament.name = name;
		tournament.description = description;
		tournament.owningDiscordServer = interaction.guild.id;
		tournament.hosts = [interaction.user.id];
		tournament.requireFriendCode = requireCode;

		const playerRole = await interaction.guild.roles.create({ name: `${tournament.name} Participant` });

		tournament.participantRole = playerRole.id;

		await tournament.save();

		await interaction.reply(
			`Tournament ${name} created! For future commands, refer to this tournament by its name \`${name}\` using auto-complete.`
		);
	}
}
