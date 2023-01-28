import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ContextMenuCommandBuilder, UserContextMenuCommandInteraction, userMention } from "discord.js";
import { ContextCommand } from "../ContextCommand";
import { ManualParticipant } from "../database/orm";
import { getLogger, Logger } from "../util/logger";
import { authenticateHost } from "./database";

export class ForceDropCommand extends ContextCommand {
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

	protected override async execute(interaction: UserContextMenuCommandInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		// more useful than user since we need to manage roles, still has the id
		const member = interaction.targetMember;

		const players = await ManualParticipant.find({ where: { discordId: member.id } });

		if (players.length < 1) {
			await interaction.reply({ content: `That user is not in any tournaments.`, ephemeral: true });
			return;
		}

		// TODO: if length > 1, modal to select
		const player = players[0];

		const tournament = player.tournament;

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		// don't use participantRoleProvider because it's made for ChallongeTournaments with exposed ids
		// TODO: fix above?
		await member.roles.remove(tournament.participantRole);

		await player.remove();
		await member.send(`You have been dropped from ${tournament.name} by the hosts.`);
		await interaction.reply(`${userMention(member.id)} has been dropped from ${tournament.name}.`);
	}
}
