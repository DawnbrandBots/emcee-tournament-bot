import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ContextMenuCommandBuilder, UserContextMenuCommandInteraction, userMention } from "discord.js";
import { ContextCommand } from "../ContextCommand";
import { ManualTournament } from "../database/orm";
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
		const tournamentName = "dummy"; // TODO: Get by modal
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		// more useful than user since we need to manage roles, still has the id
		const member = interaction.targetMember;
		const player = tournament.participants.find(p => (p.discordId = member.id));
		if (!player) {
			await interaction.reply({
				content: `That player is not in the tournament.`,
				ephemeral: true
			});
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
