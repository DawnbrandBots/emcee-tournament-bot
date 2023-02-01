import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { TournamentStatus } from "../database/interface";
import { ManualTournament } from "../database/orm";
import { AutocompletableCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost, autocompleteTournament, dropPlayer, tournamentOption } from "./database";

export class StartCommand extends AutocompletableCommand {
	#logger = getLogger("command:start");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("start")
			.setDescription("Close registration and prepare to commence a tournament.")
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
		const tournament = await ManualTournament.findOneOrFail({
			where: { name: tournamentName },
			relations: ["participant"]
		});

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		if (tournament.publicChannel) {
			const publicChannel = await interaction.client.channels.fetch(tournament.publicChannel);
			if (publicChannel && publicChannel.isTextBased()) {
				if (tournament.registerMessage) {
					const registerMessage = await publicChannel.messages.fetch(tournament.registerMessage);
					await registerMessage?.delete();
				}
				await publicChannel.send(`Registration for ${tournament.name} is now closed!`);
			}
		}

		const playersToDrop = tournament.participants.filter(p => !p.deck?.approved);

		if (playersToDrop.length === tournament.participants.length) {
			await interaction.reply(`No players have an approved deck, so you cannot start the tournament.`);
			return;
		}

		for (const player of playersToDrop) {
			const member = interaction.guild.members.cache.get(player.discordId);
			if (!member) {
				// the member *should* exist. the guild is cached and a player should be in the server
				continue;
			}

			// we don't want a host log of every drop in a row, so we don't give dropPlayer the interaction to reply to, but we should tell the players
			await dropPlayer(tournament, player, member, undefined);
			await member.send(`You have been dropped from ${tournament.name}.`);
		}

		tournament.status = TournamentStatus.IPR;
		await tournament.save();
	}
}
