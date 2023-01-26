import { Interaction } from "discord.js";
import { CommandSupport } from "../Command";
import { TimerCommand } from "../slash/timer";
import { AutocompletableCommand, SlashCommand } from "../SlashCommand";
import { serialiseInteraction } from "../util";
import { getLogger } from "../util/logger";

const logger = getLogger("interaction");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function makeHandler({ organiserRole, timeWizard }: CommandSupport) {
	const commandArray = [
		// Construct SlashCommand objects here
		new TimerCommand(organiserRole, timeWizard)
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
