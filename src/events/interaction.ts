import { Interaction } from "discord.js";
import { CommandSupport } from "../Command";
import { ContextCommand } from "../ContextCommand";
import { ChannelCommand } from "../slash/channel";
import { CreateCommand } from "../slash/create";
import { CsvCommand } from "../slash/csv";
import { DeckCommand } from "../slash/deck";
import { DropCommand } from "../slash/drop";
import { FinishCommand } from "../slash/finish";
import { ForceDropContextCommand, ForceDropSlashCommand } from "../slash/forcedrop";
import { HostCommand } from "../slash/host";
import { InfoCommand } from "../slash/info";
import { ListCommand } from "../slash/list";
import { TimerCommand } from "../slash/timer";
import { UpdateCommand } from "../slash/update";
import { AutocompletableCommand, SlashCommand } from "../SlashCommand";
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
		new CsvCommand(),
		new ListCommand(organiserRole)
	];

	const contextArray = [new ForceDropContextCommand()];

	const commands = new Map<string, SlashCommand>();
	const autocompletes = new Map<string, AutocompletableCommand>();
	const contexts = new Map<string, ContextCommand>();

	for (const command of commandArray) {
		commands.set(command.meta.name, command);
		if (command instanceof AutocompletableCommand) {
			autocompletes.set(command.meta.name, command);
		}
	}

	for (const context of contextArray) {
		contexts.set(context.meta.name, context);
	}

	return async function interactionCreate(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			logger.verbose(serialiseInteraction(interaction));
			await commands.get(interaction.commandName)?.run(interaction);
		} else if (interaction.isAutocomplete()) {
			logger.verbose(serialiseInteraction(interaction, { autocomplete: interaction.options.getFocused() }));
			await autocompletes.get(interaction.commandName)?.autocomplete(interaction);
		} else if (interaction.isContextMenuCommand()) {
			logger.verbose(serialiseInteraction(interaction));
			await contexts.get(interaction.commandName)?.run(interaction);
		}
	};
}
