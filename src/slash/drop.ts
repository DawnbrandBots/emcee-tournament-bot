import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	userMention
} from "discord.js";
import { ManualParticipant } from "../database/orm";
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
		// more useful than user since we need to manage roles, still has the id
		const member = interaction.member;

		const players = await ManualParticipant.find({ where: { discordId: member.id } });

		const tournamentName = interaction.options.getString("tournament", true);
		const player = players.filter(p => p.tournament.name === tournamentName).pop();

		if (!player) {
			await interaction.reply({ content: `You are not in that tournament.`, ephemeral: true });
			return;
		}

		const tournament = player.tournament;

		if (!(await authenticatePlayer(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
		// TODO: fix above?
		await member.roles.remove(tournament.participantRole);

		await player.remove();
		await interaction.reply(`You have dropped from ${tournament.name}.`);
		if (tournament.privateChannel) {
			await send(
				interaction.client,
				tournament.privateChannel,
				`${userMention(member.id)} has dropped from ${tournament.name}.`
			);
		}
	}
}
