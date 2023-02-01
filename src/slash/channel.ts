import { ChannelType, RESTPostAPIApplicationCommandsJSONBody, Snowflake } from "discord-api-types/v10";
import { AutocompleteInteraction, channelMention, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, tournamentOption } from "./database";

export class ChannelCommand extends AutocompletableCommand<"cached"> {
	#logger = getLogger("command:channel");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("channel")
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

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	getChannel(interaction: ChatInputCommandInteraction): Snowflake {
		return (interaction.channel?.isThread() && interaction.channel.parentId) || interaction.channelId;
	}

	async toggleChannel(
		channel: string,
		key: "publicChannel" | "privateChannel",
		tournament: ManualTournament,
		interaction: ChatInputCommandInteraction
	): Promise<void> {
		const prettyKey = key === "publicChannel" ? "public announcement channel" : "private deck channel";
		if (tournament[key] === channel) {
			tournament[key] = undefined;
			await tournament.save();
			await interaction.reply(`${channelMention(channel)} removed as the ${prettyKey} for ${tournament.name}.`);
			return;
		}
		// if other channel or not set
		const oldChannel = tournament[key];
		tournament[key] = channel;
		await tournament.save();
		await interaction.reply(
			`${channelMention(channel)} set as the new ${prettyKey} for ${tournament.name}${
				oldChannel ? `, replacing ${channelMention(oldChannel)}` : ""
			}.`
		);
		return;
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
		await this.toggleChannel(
			channel,
			type === "public" ? "publicChannel" : "privateChannel",
			tournament,
			interaction
		);
	}
}
