import { ChannelType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../SlashCommand";
import { serialiseInteraction } from "../util";
import { Logger, getLogger } from "../util/logger";

export class InviteCommand extends SlashCommand {
	#logger = getLogger("command:invite");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("invite")
			.setDescription("Create invite links.")
			.setDMPermission(false)
			.setDefaultMemberPermissions(0)
			.addChannelOption(option =>
				option
					.setName("channel")
					.setDescription("Invite target channel.")
					.addChannelTypes(ChannelType.GuildText)
					.setRequired(true)
			)
			.addIntegerOption(option =>
				option
					.setName("uses")
					.setDescription("Maximum number of uses, 0 for infinite")
					.setMinValue(0)
					.setMaxValue(100)
					.setRequired(true)
			)
			.addIntegerOption(option =>
				option
					.setName("quantity")
					.setDescription("How many invites do you want to create?")
					.setMinValue(1)
					.setRequired(false)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		const channel = interaction.options.getChannel("channel", true, [ChannelType.GuildText]);
		const maxUses = interaction.options.getInteger("uses", false) ?? 1;
		const quantity = interaction.options.getInteger("quantity", false) ?? 1;
		if (quantity > 1) {
			await interaction.deferReply();
		}
		const invites = [];
		for (let i = 0; i < quantity; i++) {
			const invite = await channel.createInvite({
				maxAge: 0,
				maxUses,
				unique: true,
				reason: "Created with /invite"
			});
			this.logger.verbose(serialiseInteraction(interaction, { url: invite.url }));
			invites.push(invite.url);
		}
		const response = invites.join("\n");
		if (quantity > 1) {
			await interaction.editReply(response);
		} else {
			await interaction.reply(response);
		}
	}
}
