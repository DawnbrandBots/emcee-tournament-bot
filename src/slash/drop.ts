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
import { send } from "../util/discord";
import { getLogger, Logger } from "../util/logger";
import { authenticatePlayer, autocompleteTournament, tournamentOption } from "./database";

export class DropCommand extends AutocompletableCommand {
	#logger = getLogger("command:drop");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("drop")
			.setDescription("Remove yourself from a tournament.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addStringOption(tournamentOption)
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

		const player = await authenticatePlayer(tournament, interaction);

		if (!player) {
			// rejection messages handled in helper
			return;
		}

		// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
		// TODO: fix above?
		const member = interaction.member || interaction.guild.members.fetch(interaction.user.id);
		await member.roles.remove(tournament.participantRole);

		await player.remove();
		await interaction.reply(`You have been dropped from ${tournament.name}.`);
		if (tournament.privateChannel) {
			// is there a better way to do this than the old util?
			// should we be storing only the channel ID?
			await send(
				interaction.client,
				tournament.privateChannel,
				`${userMention(interaction.user.id)} has dropped themself from ${tournament.name}.`
			);
		}
	}
}
