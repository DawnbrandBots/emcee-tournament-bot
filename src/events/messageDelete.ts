import { Client, Message, PartialMessage } from "discord.js";
import { CommandSupport } from "../Command";
import { ManualDeckSubmission } from "../database/orm";
import { dropPlayer } from "../slash/database";
import { getLogger } from "../util/logger";

const logger = getLogger("messageDelete");

export function makeHandler(bot: Client, support: CommandSupport): (msg: Message | PartialMessage) => Promise<void> {
	return async function messageDelete(msg: Message | PartialMessage): Promise<void> {
		support.database.cleanRegistration(msg.channelId, msg.id);
		try {
			// don't need the inner join on tournament because even - especially - mid-tournament, a deck dodger should be dropped
			const deletedDecks = await ManualDeckSubmission.find({
				where: { message: msg.id },
				relations: ["tournament", "participant"]
			});
			for (const deck of deletedDecks) {
				const guild = await bot.guilds.fetch(deck.tournament.owningDiscordServer);
				const member = await guild.members.fetch(deck.discordId);
				await dropPlayer(deck.tournament, deck.participant, member);
			}
		} catch (e) {
			logger.error(e);
		}
	};
}
