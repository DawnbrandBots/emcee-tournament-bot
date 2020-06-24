import { Message } from "eris";
import { prefix } from "../config/config.json";
import { createTournament, updateTournament, listTournaments, listPlayers, getPlayerDeck } from "./tournament";
import { addChannel, removeChannel } from "./channels";
import { open, start, cancelTournament, help } from "./basic";
import { addOrganiser, removeOrganiser } from "./organiser";
import { nextRound } from "./round";
import { submitScore } from "./score";
import { UserError } from "../errors";
import { logger } from "../logger";

const commands: { [command: string]: (msg: Message, args: string[]) => Promise<void> } = {
	create: createTournament,
	update: updateTournament,
	addchannel: addChannel,
	removechannel: removeChannel,
	open: open,
	start: start,
	cancel: cancelTournament,
	addorganiser: addOrganiser,
	removeorganiser: removeOrganiser,
	addorganizer: addOrganiser, // US alias
	removeorganizer: removeOrganiser,
	round: nextRound,
	score: submitScore,
	list: listTournaments,
	players: listPlayers,
	deck: getPlayerDeck,
	help: help
};

export async function parseCommand(msg: Message): Promise<void> {
	if (!msg.content.startsWith(prefix)) {
		return;
	}
	const terms = msg.content.split(" ");
	const cmdName = terms[0].slice(prefix.length).toLowerCase();
	const args = terms
		.slice(1)
		.join(" ")
		.split("|")
		.map(s => s.trim());
	if (cmdName in commands) {
		try {
			await commands[cmdName](msg, args);
		} catch (e) {
			if (e instanceof UserError) {
				await msg.channel.createMessage(e.message);
				return;
			}

			// internal error
			logger.log({
				level: "error",
				message: e.message
			});
		}
	}
}
