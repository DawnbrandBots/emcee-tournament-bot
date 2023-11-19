import { ButtonStyle, RESTPostAPIApplicationCommandsJSONBody, TextInputStyle } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ChatInputCommandInteraction,
	DiscordAPIError,
	GuildMember,
	ModalBuilder,
	ModalMessageModalSubmitInteraction,
	RESTJSONErrorCodes,
	SlashCommandBuilder,
	TextInputBuilder,
	channelMention
} from "discord.js";
import { Not } from "typeorm";
import { AutocompletableCommand, ButtonClickHandler, MessageModalSubmitHandler } from "../SlashCommand";
import { TournamentStatus } from "../database/interface";
import { ManualParticipant, ManualTournament } from "../database/orm";
import { send } from "../util/discord";
import { Logger, getLogger } from "../util/logger";
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

	override async autocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		autocompleteTournament(interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
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
			.setEmoji("🎫");
		row.addComponents(button);

		const message = await send(interaction.client, tournament.publicChannel, {
			content: `__Registration for **${tournament.name}** is now open!__\n${
				tournament.description
			}\n\nPlayer Cap: ${printPlayerCap(
				tournament
			)}\n\nClick the button below to register, then follow the prompts.\nA tournament host will then manually verify your deck when they are available.`,
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

export function formatFriendCode(friendCode: number): string {
	const friendString = friendCode.toString(10).padStart(9, "0");
	return `${friendString.slice(0, 3)}-${friendString.slice(3, 6)}-${friendString.slice(6, 9)}`;
}

async function setNickname(member: GuildMember, friendCode: number, ign?: string): Promise<void> {
	const name = ign || member.user.username;
	const formattedCode = formatFriendCode(friendCode);
	// Discord maximum: 32. Friend code plus space takes 12.
	if (name.length <= 20) {
		await member.setNickname(`${name} ${formattedCode}`, `Friend code added by Emcee`);
	} else {
		const truncated = name.slice(0, 20);
		await member.setNickname(`${truncated}…${formattedCode}`, `Friend code added by Emcee`);
	}
}

async function registerParticipant(
	interaction: ButtonInteraction<"cached"> | ModalMessageModalSubmitInteraction<"cached">,
	tournament: ManualTournament,
	friendCode?: number,
	ign?: string
): Promise<void> {
	const player: ManualParticipant = new ManualParticipant();
	player.discordId = interaction.user.id;
	player.tournament = tournament;
	player.ign = ign;
	player.friendCode = friendCode;
	await player.save();
	try {
		await interaction.user.send(
			`Please upload screenshots of your decklist to register, all attached to one message. \n**Important**: Please do not delete your message! You will be dropped for cheating, as this can make your decklist invisible to hosts.`
		);
		await interaction.reply({
			content: "Please check your direct messages for next steps.",
			ephemeral: true
		});
		if (friendCode) {
			await setNickname(interaction.member, friendCode, ign);
		}
	} catch (e) {
		if (
			tournament.privateChannel &&
			e instanceof DiscordAPIError &&
			e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
		) {
			await interaction.reply({
				content: "⚠️ Please allow direct messages from this server to proceed with deck submission.",
				ephemeral: true
			});
			await send(
				interaction.client,
				tournament.privateChannel,
				`${interaction.user} (${interaction.user.tag}) is trying to sign up for **${tournament.name}**, but I cannot send them DMs. Please ask them to allow DMs from this server.`
			);
			await player.remove();
		} else {
			throw e;
		}
	}
}

export class RegisterButtonHandler implements ButtonClickHandler {
	readonly buttonIds = ["registerButton"];

	async click(interaction: ButtonInteraction<"cached">): Promise<void> {
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
		const participant = await ManualParticipant.find({
			where: { tournamentId: tournament.tournamentId, discordId: interaction.user.id }
		});
		if (participant.length) {
			await interaction.reply({
				content:
					"You are already registered for this tournament! You can submit a new deck by just sending a new direct message.",
				ephemeral: true
			});
			await interaction.user.send(
				`You are already registered for ${tournament.name}! You can submit a new deck by just sending a new message.`
			);
			return;
		}
		if (tournament.requireFriendCode) {
			// Max title length of 45: https://github.com/DawnbrandBots/emcee-tournament-bot/issues/521
			const modal = new ModalBuilder()
				.setCustomId("registerModal")
				.setTitle(`Register for ${tournament.name.slice(0, 32)}`);
			const friendCodeInput = new TextInputBuilder()
				.setCustomId("friendCode")
				.setLabel("Master Duel Friend Code")
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
				.setPlaceholder("000000000")
				.setMinLength(9)
				.setMaxLength(11);
			const ignInput = new TextInputBuilder()
				.setCustomId("ign")
				.setLabel("In-game name, if different")
				.setStyle(TextInputStyle.Short)
				.setRequired(false)
				.setPlaceholder(interaction.user.username.slice(0, 12))
				.setMinLength(3)
				.setMaxLength(12);
			modal.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(friendCodeInput),
				new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput)
			);
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

export class RegisterModalHandler implements MessageModalSubmitHandler {
	readonly modalIds = ["registerModal"];

	async submit(interaction: ModalMessageModalSubmitInteraction<"cached">): Promise<void> {
		const tournament = await ManualTournament.findOneOrFail({
			where: { owningDiscordServer: interaction.guildId, registerMessage: interaction.message.id }
		});
		const ign = interaction.fields.getTextInputValue("ign");
		const friendCodeString = interaction.fields.getTextInputValue("friendCode");
		const friendCode = parseFriendCode(friendCodeString);
		if (!friendCode && tournament.requireFriendCode) {
			await interaction.reply({
				content: `This tournament requires a Master Duel friend code, and you did not enter a valid one! Please try again, ${interaction.user}!`,
				ephemeral: true
			});
			return;
		}
		await registerParticipant(interaction, tournament, friendCode, ign);
	}
}
