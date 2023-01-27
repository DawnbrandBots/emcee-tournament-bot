import { Interaction } from "discord.js";
import { CommandSupport } from "../Command";
import { ChannelCommand } from "../slash/channel";
import { CreateCommand } from "../slash/create";
import { CsvCommand } from "../slash/csv";
import { DeckCommand } from "../slash/deck";
import { DropCommand } from "../slash/drop";
import { FinishCommand } from "../slash/finish";
import { ForceDropCommand } from "../slash/forcedrop";
import { HostCommand } from "../slash/host";
import { InfoCommand } from "../slash/info";
import { OpenCommand } from "../slash/open";
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
		new ForceDropCommand(), // will include participantRole if adapted later
		new DropCommand(),
		new DeckCommand(),
		new FinishCommand(),
		new OpenCommand(),
		new CsvCommand()
	];
	const commands = new Map<string, SlashCommand>();
	const autocompletes = new Map<string, AutocompletableCommand>();

	for (const command of commandArray) {
		commands.set(command.meta.name, command);
		if (command instanceof AutocompletableCommand) {
			autocompletes.set(command.meta.name, command);
		}
	}

	return async function interactionCreate(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			logger.verbose(serialiseInteraction(interaction));
			await commands.get(interaction.commandName)?.run(interaction);
		} else if (interaction.isAutocomplete()) {
			logger.verbose(serialiseInteraction(interaction, { autocomplete: interaction.options.getFocused() }));
			await autocompletes.get(interaction.commandName)?.autocomplete(interaction);
		}
	};
}
