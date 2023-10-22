import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	DiscordAPIError,
	DiscordjsErrorCodes,
	SlashCommandBuilder
} from "discord.js";
import { SlashCommand } from "../SlashCommand";
import { encodeCustomId } from "../events/interaction";
import { serialiseInteraction } from "../util";
import { Logger, getLogger } from "../util/logger";

export class KickAllCommand extends SlashCommand {
	#logger = getLogger("command:kickrole");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("kickrole")
			.setDescription(
				"Mass member removal by role. With no options specified, all unroled members will be kicked."
			)
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addRoleOption(option =>
				option
					.setName("highest-role")
					.setDescription("Kick all members with this role if it is their highest role.")
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		const role = interaction.options.getRole("highest-role") ?? interaction.guild.roles.everyone;
		const content =
			role === interaction.guild.roles.everyone
				? "Kick all members without a role?"
				: `Kick all members with ${role} as their highest role?`;

		const confirmButton = new ButtonBuilder()
			.setCustomId(encodeCustomId("confirmkickrole", role.id))
			.setLabel("Yes")
			.setStyle(ButtonStyle.Danger);
		const cancelButton = new ButtonBuilder()
			.setCustomId("cancelkickrole")
			.setLabel("No")
			.setStyle(ButtonStyle.Secondary);
		const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)];
		const reply = await interaction.reply({
			content,
			allowedMentions: { roles: [] },
			components
		});

		// Based on Bastion's /deck
		const filter = (i: ButtonInteraction): boolean => {
			this.logger.info(serialiseInteraction(interaction), `click: ${i.user.id}`);
			if (i.user.id === interaction.user.id) {
				return true;
			}
			i.reply({
				content: "Buttons can only be used by the original user",
				ephemeral: true
			}).catch(e => this.logger.error(serialiseInteraction(interaction), e));
			return false;
		};

		// we don't await this promise, we set up the callback and then let the method complete
		reply
			.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 30000 })
			.then(async i => {
				this.logger.info(serialiseInteraction(interaction), i.customId);
				confirmButton.setDisabled(true);
				cancelButton.setDisabled(true);
				interaction
					.editReply({ content, components })
					.catch(e => this.logger.error(serialiseInteraction(interaction), e));

				if (i.customId === "cancelkickrole") {
					i.reply("Kick cancelled.");
					return;
				}

				await i.deferReply();
				const members = await interaction.guild.members.fetch();
				let results = "\n";
				for (const [, member] of members) {
					if (member.roles.highest === role) {
						this.logger.info(
							serialiseInteraction(interaction, {
								kick: member.id,
								tag: member.user.tag,
								kickable: member.kickable
							})
						);
						if (member.kickable) {
							try {
								await member.kick(`Emcee /kick used by ${interaction.user} (${interaction.user.tag})`);
								results += `- ${member} (${member.user.tag})\n`;
							} catch (e) {
								this.logger.error(serialiseInteraction(interaction), e);
							}
						}
					}
				}
				if (results.length < 1980) {
					await i.editReply(`Kick complete.${results}`);
				} else {
					await i.editReply("Kick complete.");
				}
			})
			.catch(async (err: DiscordAPIError) => {
				// a rejection can just mean the timeout was reached without a response
				// otherwise, though, we want to treat it as a normal error
				if (err.code !== DiscordjsErrorCodes.InteractionCollectorError) {
					this.logger.error(serialiseInteraction(interaction), err);
				}
				// disable original buttons, regardless of error source
				confirmButton.setDisabled(true);
				cancelButton.setDisabled(true);
				interaction
					.editReply({
						content,
						components
					})
					.catch(e => this.logger.error(serialiseInteraction(interaction), e));
			});
	}
}
