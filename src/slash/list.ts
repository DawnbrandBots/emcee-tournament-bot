import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { chatInputApplicationCommandMention, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { ChallongeTournament, ManualTournament } from "../database/orm";
import { splitText } from "../deck";
import { OrganiserRoleProvider } from "../role/organiser";
import { SlashCommand } from "../SlashCommand";
import { getLogger, Logger } from "../util/logger";

export class ListCommand extends SlashCommand {
	#logger = getLogger("command:list");

	constructor(private organiserRole: OrganiserRoleProvider) {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("list")
			.setDescription("Enumerate all tournaments in this server.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
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
			this.#logger.verbose(`Rejected /list attempt from ${interaction.user} in ${interaction.guildId}.`);
			await interaction.reply({ content: `You cannot use this.`, ephemeral: true });
			return;
		}

		const owningDiscordServer = interaction.guildId;
		const [manual, challonge] = await Promise.all([
			ManualTournament.find({ where: { owningDiscordServer }, relations: [] }),
			ChallongeTournament.find({ where: { owningDiscordServer }, relations: [] })
		]);
		let text = "__Manual (name | description | status)__\n";
		if (manual.length) {
			text += manual.map(t => `${t.name} | ${t.description} | ${t.status}`).join("\n");
		} else {
			if (!interaction.guild.commands.cache.size) {
				await interaction.guild.commands.fetch();
			}
			const id = interaction.guild.commands.cache.find(command => command.name === "create")?.id || "";
			const mention = chatInputApplicationCommandMention("create", id);
			text += `None. Try ${mention}!`;
		}
		text += "\n\n__Challonge (ID | name | description | status)__\n";
		if (challonge.length) {
			text += challonge.map(t => `${t.tournamentId} | ${t.name} | ${t.description} | ${t.status}`).join("\n");
		} else {
			text += "None";
		}
		const [first, ...rest] = splitText(text);
		await interaction.reply(first);
		for (const message of rest) {
			await interaction.followUp(message);
		}
	}
}
