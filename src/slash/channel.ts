import { ChannelType, RESTPostAPIApplicationCommandsJSONBody, Snowflake } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	channelMention,
	ChatInputCommandInteraction,
	SlashCommandBuilder
} from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class ChannelCommand extends AutocompletableCommand {
	#logger = getLogger("command:channel");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("host")
			.setDescription("Edit the channels of a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
			.addStringOption(option =>
				option
					.setName("type")
					.setDescription("Whether to edit a public announcement channel or a private deck channel.")
					.setRequired(true)
					.addChoices({ name: "public", value: "public" }, { name: "private", value: "private" })
			)
			.addChannelOption(option =>
				option
					.setName("channel")
					.setDescription("The channel to toggle.")
					.addChannelTypes(ChannelType.GuildText)
			)
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
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		const type = interaction.options.getString("type", true);
		// default to current channel if not specified
		const channel = interaction.options.getChannel("channel")?.id || this.getChannel(interaction);
		// code cleaned up somewhat but still repetetive between public/private. way to reuse code acting on different properties?
		if (type === "public") {
			if (tournament.publicChannel === channel) {
				tournament.publicChannel = undefined;
				await tournament.save();
				await interaction.reply(
					`${channelMention(channel)} removed as the public announcement channel for ${tournament.name}.`
				);
				return;
			}
			// if other channel or not set
			const oldChannel = tournament.publicChannel;
			tournament.publicChannel = channel;
			await tournament.save();
			await interaction.reply(
				`${channelMention(channel)} set as the new public announcement channel for ${tournament.name}${
					oldChannel ? `, replacing ${channelMention(oldChannel)}` : ""
				}.`
			);
			return;
		}
		// if (type === "private")
		if (tournament.privateChannel === channel) {
			tournament.privateChannel = undefined;
			await tournament.save();
			await interaction.reply(
				`${channelMention(channel)} removed as the private deck channel for ${tournament.name}.`
			);
			return;
		}
		// if other channel or not set
		const oldChannel = tournament.privateChannel;
		tournament.privateChannel = channel;
		await tournament.save();
		await interaction.reply(
			`${channelMention(channel)} set as the new private deck channel for ${tournament.name}${
				oldChannel ? `, replacing ${channelMention(oldChannel)}` : ""
			}.`
		);
		return;
	}
}
