// Adapted from https://github.com/DawnbrandBots/bastion-bot/blob/master/src/Command.ts
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	AutocompleteInteraction,
	ButtonInteraction,
	CacheType,
	ChatInputCommandInteraction,
	ModalMessageModalSubmitInteraction
} from "discord.js";
import { serialiseInteraction } from "./util";
import { Logger } from "./util/logger";

export abstract class SlashCommand<Cached extends CacheType = CacheType> {
	static get meta(): RESTPostAPIApplicationCommandsJSONBody {
		throw new Error("Not implemented");
	}

	get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return (this.constructor as typeof SlashCommand).meta;
	}

	protected abstract get logger(): Logger;

	/**
	 * Execute this command in response to a Slash Command. May throw exceptions,
	 * which will be captured and logged appropriately, and feedback will be
	 * provided to the user.
	 *
	 * @param interaction
	 */
	protected abstract execute(interaction: ChatInputCommandInteraction<Cached>): Promise<void>;

	/**
	 * Run this command in response to user interaction from start to finish.
	 * Does not throw exceptions.
	 *
	 * @param interaction
	 */
	async run(interaction: ChatInputCommandInteraction<Cached>): Promise<void> {
		try {
			this.logger.verbose(
				serialiseInteraction(interaction, { event: "attempt", ping: interaction.client.ws.ping })
			);
			const latency = await this.execute(interaction);
			this.logger.verbose(serialiseInteraction(interaction, { event: "success", latency }));
		} catch (error) {
			this.logger.error(serialiseInteraction(interaction), error);
			let method;
			if (interaction.replied) {
				method = "followUp" as const;
			} else if (interaction.deferred) {
				method = "editReply" as const;
			} else {
				method = "reply" as const;
			}
			await interaction[method]("Something went wrong. Please try again later.").catch(e =>
				this.logger.error(serialiseInteraction(interaction), e)
			);
		}
	}
}

export abstract class AutocompletableCommand<Cached extends CacheType = CacheType> extends SlashCommand<Cached> {
	abstract autocomplete(interaction: AutocompleteInteraction<Cached>): Promise<void>;
}

export interface ButtonClickHandler<Cached extends CacheType = CacheType> {
	readonly buttonIds: string[];
	click(interaction: ButtonInteraction<Cached>, ...args: string[]): Promise<void>;
}

export interface MessageModalSubmitHandler<Cached extends CacheType = CacheType> {
	readonly modalIds: string[];
	submit(interaction: ModalMessageModalSubmitInteraction<Cached>, ...args: string[]): Promise<void>;
}
