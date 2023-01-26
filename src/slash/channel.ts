import { ChannelType, RESTPostAPIApplicationCommandsJSONBody, Snowflake } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	channelMention,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament } from "./database";

export class ChannelCommand extends AutocompletableCommand {
	#logger = getLogger("command:channel");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const tournamentOption = new SlashCommandStringOption()
			.setName("tournament")
			.setDescription("The name of the tournament to edit.")
			.setRequired(true)
			.setAutocomplete(true);
		const typeOption = new SlashCommandStringOption()
			.setName("type")
			.setDescription("Whether to edit a public announcement channel or a private deck channel.")
			.setRequired(true)
			.addChoices({ name: "public", value: "public" }, { name: "private", value: "private" });
		const addSubcommand = new SlashCommandSubcommandBuilder()
			.setName("add")
			.setDescription("Add a channel to the tournament.")
			.addStringOption(tournamentOption)
			.addStringOption(typeOption)
			.addChannelOption(option =>
				option.setName("channel").setDescription("The user to add.").addChannelTypes(ChannelType.GuildText)
			);
		const removeSubcommand = new SlashCommandSubcommandBuilder()
			.setName("remove")
			.setDescription("Remove a channel from the tournament.")
			.addStringOption(tournamentOption)
			.addStringOption(typeOption)
			.addChannelOption(option => option.setName("channel").setDescription("The channel to remove."));
		return new SlashCommandBuilder()
			.setName("host")
			.setDescription("Edit the channels of a tournament.")
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
		autocompleteTournament(interaction);
	}

	getChannel(interaction: ChatInputCommandInteraction): Snowflake {
		return (interaction.channel?.isThread() && interaction.channel.parentId) || interaction.channelId;
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

		const mode = interaction.options.getSubcommand(true);
		const type = interaction.options.getString("type", true);
		// default to current channel if not specified
		const channel = interaction.options.getChannel("channel")?.id || this.getChannel(interaction);
		// heavily nested and repetitive code, is there any way to clean this up?
		if (mode === "add") {
			if (type === "public") {
				if (tournament.publicChannel === channel) {
					await interaction.reply({
						content: `That is already the tournament's public channel.`,
						ephemeral: true
					});
					return;
				}
				tournament.publicChannel = channel;
				await tournament.save();
				await interaction.reply({
					content: `${channelMention(channel)} has been set as the public announcement channel for ${
						tournament.name
					}!`
				});
				return;
			}
			// if (type === "private")
			if (tournament.privateChannel === channel) {
				await interaction.reply({
					content: `That is already the tournament's private channel.`,
					ephemeral: true
				});
				return;
			}
			tournament.privateChannel = channel;
			await tournament.save();
			await interaction.reply({
				content: `${channelMention(channel)} has been set as the private deck channel for ${tournament.name}!`
			});
			return;
		}
		// if (mode === "remove")
		if (type === "public") {
			if (tournament.publicChannel !== channel) {
				await interaction.reply({
					content: `That is not the tournament's public channel.`,
					ephemeral: true
				});
				return;
			}
			tournament.publicChannel = undefined;
			await tournament.save();
			await interaction.reply({
				content: `${channelMention(channel)} has been removed as the public announcement channel for ${
					tournament.name
				}!`
			});
			return;
		}
		// if (type === "private")
		if (tournament.privateChannel !== channel) {
			await interaction.reply({
				content: `That is already the tournament's private channel.`,
				ephemeral: true
			});
			return;
		}
		tournament.privateChannel = undefined;
		await tournament.save();
		await interaction.reply({
			content: `${channelMention(channel)} has been removed as the private deck channel for ${tournament.name}!`
		});
		return;
	}
}
