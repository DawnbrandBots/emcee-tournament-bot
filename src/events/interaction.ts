import { Interaction } from "discord.js";
import { CommandSupport } from "../Command";
import { ContextCommand } from "../ContextCommand";
import { AutocompletableCommand, ButtonClickHandler, MessageModalSubmitHandler, SlashCommand } from "../SlashCommand";
import { ChannelCommand } from "../slash/channel";
import { CreateCommand } from "../slash/create";
import { CsvCommand } from "../slash/csv";
import {
	AcceptButtonHandler,
	AcceptLabelModal,
	DeckCommand,
	QuickAcceptButtonHandler,
	RejectButtonHandler,
	RejectReasonModal
} from "../slash/deck";
import { DropCommand } from "../slash/drop";
import { FinishCommand } from "../slash/finish";
import { ForceDropContextCommand, ForceDropSlashCommand } from "../slash/forcedrop";
import { HostCommand } from "../slash/host";
import { InfoCommand } from "../slash/info";
import { InviteCommand } from "../slash/invite";
import { KickAllCommand } from "../slash/kickrole";
import { ListCommand } from "../slash/list";
import { OpenCommand, RegisterButtonHandler, RegisterModalHandler } from "../slash/open";
import { QueueCommand } from "../slash/queue";
import { ReportWinCommand } from "../slash/report-win";
import { StartCommand } from "../slash/start";
import { TimerCommand } from "../slash/timer";
import { UpdateCommand } from "../slash/update";
import { serialiseInteraction } from "../util";
import { getLogger } from "../util/logger";

const logger = getLogger("interaction");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function makeHandler({ organiserRole, timeWizard }: CommandSupport) {
	const commandArray = [
		// Construct SlashCommand objects here
		new TimerCommand(organiserRole, timeWizard),
		new CreateCommand(organiserRole),
		new HostCommand(),
		new ChannelCommand(),
		new UpdateCommand(),
		new InfoCommand(),
		new DropCommand(), // will include participantRole if adapted later
		new ForceDropSlashCommand(),
		new DeckCommand(),
		new FinishCommand(),
		new OpenCommand(),
		new CsvCommand(),
		new StartCommand(),
		new ListCommand(organiserRole),
		new QueueCommand(),
		new ReportWinCommand(),
		new InviteCommand(),
		new KickAllCommand()
	];
	const buttonArray = [
		new RegisterButtonHandler(),
		new AcceptButtonHandler(),
		new QuickAcceptButtonHandler(),
		new RejectButtonHandler()
	];
	const messageModalArray = [new RegisterModalHandler(), new AcceptLabelModal(), new RejectReasonModal()];
	const contextArray = [new ForceDropContextCommand()];

	const commands = new Map<string, SlashCommand>();
	const autocompletes = new Map<string, AutocompletableCommand>();
	const buttons = new Map<string, ButtonClickHandler>();
	const messageModals = new Map<string, MessageModalSubmitHandler>();
	const contexts = new Map<string, ContextCommand>();

	for (const command of commandArray) {
		commands.set(command.meta.name, command);
		if (command instanceof AutocompletableCommand) {
			autocompletes.set(command.meta.name, command);
		}
	}
	for (const button of buttonArray) {
		for (const id of button.buttonIds) {
			buttons.set(id, button);
		}
	}
	for (const modal of messageModalArray) {
		for (const id of modal.modalIds) {
			messageModals.set(id, modal);
		}
	}

	for (const context of contextArray) {
		contexts.set(context.meta.name, context);
	}

	return async function interactionCreate(interaction: Interaction): Promise<void> {
		if (!interaction.inCachedGuild()) {
			return;
		}
		if (interaction.isChatInputCommand()) {
			logger.verbose(serialiseInteraction(interaction));
			await commands.get(interaction.commandName)?.run(interaction);
		} else if (interaction.isAutocomplete()) {
			logger.verbose(serialiseInteraction(interaction, { autocomplete: interaction.options.getFocused() }));
			await autocompletes.get(interaction.commandName)?.autocomplete(interaction);
		} else if (interaction.isButton()) {
			logger.verbose(
				JSON.stringify({
					channel: interaction.channelId,
					message: interaction.message.id,
					guild: interaction.guildId,
					author: interaction.user.id,
					id: interaction.id,
					buttonId: interaction.customId
				})
			);
			const [name, args] = decodeCustomId(interaction.customId);
			await buttons.get(name)?.click(interaction, ...args);
		} else if (interaction.isModalSubmit() && interaction.isFromMessage()) {
			logger.verbose(
				JSON.stringify({
					channel: interaction.channelId,
					message: interaction.message.id,
					guild: interaction.guildId,
					author: interaction.user.id,
					id: interaction.id,
					modalId: interaction.customId
				})
			);
			const [name, args] = decodeCustomId(interaction.customId);
			await messageModals.get(name)?.submit(interaction, ...args);
		} else if (interaction.isContextMenuCommand()) {
			logger.verbose(serialiseInteraction(interaction));
			await contexts.get(interaction.commandName)?.run(interaction);
		}
	};
}

export function encodeCustomId(idName: string, ...args: Array<string | number>): string {
	args.unshift(idName);
	return args.join("#");
}

export function decodeCustomId(id: string): [string, string[]] {
	const [name, ...args] = id.split("#");
	return [name, args];
}
