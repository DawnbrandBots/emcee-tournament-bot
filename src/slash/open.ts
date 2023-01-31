import { ButtonStyle, RESTPostAPIApplicationCommandsJSONBody, TextInputStyle } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	CacheType,
	channelMention,
	ChatInputCommandInteraction,
	GuildMember,
	ModalBuilder,
	ModalMessageModalSubmitInteraction,
	SlashCommandBuilder,
	TextInputBuilder
} from "discord.js";
import { Not } from "typeorm";
import { TournamentStatus } from "../database/interface";
import { ManualParticipant, ManualTournament } from "../database/orm";
import { AutocompletableCommand, ButtonClickHandler, MessageModalSubmitHandler } from "../SlashCommand";
import { send } from "../util/discord";
import { getLogger, Logger } from "../util/logger";
import {
	authenticateHost,
	autocompleteTournament,
	checkParticipantCap,
	printPlayerCap,
	tournamentOption
} from "./database";

export class OpenCommand extends AutocompletableCommand {
	#logger = getLogger("command:open");

	constructor() {
		super();
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("open")
			.setDescription("Open a tournament for registration.")
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
		const tournamentName = interaction.options.getString("tournament", true);
		const tournament = await ManualTournament.findOneOrFail({ where: { name: tournamentName } });

		if (!(await authenticateHost(tournament, interaction))) {
			// rejection messages handled in helper
			return;
		}

		if (!tournament.publicChannel) {
			await interaction.reply({
				content: "This tournament has no public announcement channel to send the registration message.",
				ephemeral: true
			});
			return;
		}

		if (!tournament.privateChannel) {
			await interaction.reply({
				content: "This tournament has no private channel to accept deck submissions.",
				ephemeral: true
			});
			return;
		}

		const row = new ActionRowBuilder<ButtonBuilder>();
		const button = new ButtonBuilder()
			.setCustomId("registerButton")
			.setLabel("Click here to register!")
			.setStyle(ButtonStyle.Success)
			.setEmoji("✅");
		row.addComponents(button);

		const message = await send(interaction.client, tournament.publicChannel, {
			content: `__Registration for **${tournament.name}** is now open!__\n${
				tournament.description
			}\nPlayer Cap: ${printPlayerCap(
				tournament
			)}\nClick the button below to register, then follow the prompts.\nA tournament host will then manually verify your deck.`,
			components: [row]
		});
		tournament.registerMessage = message.id;
		await tournament.save();

		await interaction.reply(
			`Registration for ${tournament.name} is now open in ${channelMention(
				tournament.publicChannel
			)}. Look for decks in ${channelMention(tournament.privateChannel)}.`
		);
	}
}

async function setNickname(member: GuildMember, friendCode: number): Promise<void> {
	// check for redundancy
	const fcRegex = /\d{3}-\d{3}-\d{3}/;
	const baseName = member.nickname || member.user.username;
	if (fcRegex.test(baseName)) {
		return;
	}
	const friendString = friendCode.toString(10);
	const formatCode = `${friendString.slice(0, 3)}-${friendString.slice(3, 6)}-${friendString.slice(6, 9)}`;
	await member.setNickname(`${baseName} ${formatCode}`);
}

async function registerParticipant(
	interaction: ButtonInteraction | ModalMessageModalSubmitInteraction,
	tournament: ManualTournament,
	friendCode?: number
): Promise<void> {
	const player: ManualParticipant = new ManualParticipant();
	player.discordId = interaction.user.id;
	player.tournament = tournament;
	player.friendCode = friendCode;
	// first check should always be true i think but it's a typeguard on member
	if (interaction.inCachedGuild() && friendCode) {
		await setNickname(interaction.member, friendCode);
	}
	await player.save();
	await interaction.update({});
	await interaction.user.send(
		"Please upload screenshots of your decklist to register.\n**Important**: Please do not delete your message! This can make your decklist invisible to tournament hosts, which they may interpret as cheating."
	);
}

export class RegisterButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["registerButton"];

	async click(interaction: ButtonInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}
		const tournament = await ManualTournament.findOneOrFail({
			where: { owningDiscordServer: interaction.guildId, registerMessage: interaction.message.id }
		});
		// See messageReactionAdd logic
		const registrations = (
			await ManualParticipant.find({
				where: {
					discordId: interaction.user.id,
					tournamentId: Not(tournament.tournamentId),
					tournament: { status: TournamentStatus.PREPARING }
				},
				relations: ["tournament"]
			})
		).filter(p => !p.deck);
		if (registrations.length) {
			await interaction.reply({
				content: `You can only sign up for one tournament at a time, ${interaction.user}! Please either drop from or complete your registration for **${registrations[0].tournament.name}**!`,
				ephemeral: true
			});
			return;
		}
		if (tournament.status !== TournamentStatus.PREPARING) {
			// Shouldn't happen
			await interaction.reply({
				content: `Sorry ${interaction.user}, registration for the tournament has closed!`,
				ephemeral: true
			});
			return;
		}
		if (!checkParticipantCap(tournament)) {
			await interaction.reply({
				content: `Sorry ${interaction.user}, the tournament is currently full!`,
				ephemeral: true
			});
			return;
		}
		if (tournament.requireFriendCode) {
			const modal = new ModalBuilder().setCustomId("registerModal").setTitle(`Register for ${tournament.name}`);
			const deckLabelInput = new TextInputBuilder()
				.setCustomId("friendCode")
				.setLabel("Master Duel Friend Code")
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
				.setPlaceholder("000000000")
				.setMinLength(9)
				.setMaxLength(11);
			const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(deckLabelInput);
			modal.addComponents(actionRow);
			await interaction.showModal(modal);
		} else {
			await registerParticipant(interaction, tournament);
		}
	}
}

function parseFriendCode(input: string): number | undefined {
	const friendCode = parseInt(input.replaceAll(/[^\d]/g, ""));
	if (friendCode < 10e9) {
		return friendCode;
	}
}

export class FriendCodeModalHandler implements MessageModalSubmitHandler {
	readonly modalIds = ["registerModal"];

	async submit(interaction: ModalMessageModalSubmitInteraction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}

		const tournament = await ManualTournament.findOneOrFail({
			where: { owningDiscordServer: interaction.guildId, registerMessage: interaction.message.id }
		});

		const friendCodeString = interaction.fields.getTextInputValue("friendCode");
		const friendCode = parseFriendCode(friendCodeString);
		if (!friendCode && tournament.requireFriendCode) {
			await interaction.reply({
				content: `This tournament requires a Master Duel friend code, and you did not enter a valid one! Please try again, ${interaction.user}!`,
				ephemeral: true
			});
			return;
		}
		await registerParticipant(interaction, tournament, friendCode);
	}
}
