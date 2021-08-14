import { Client, Message } from "discord.js";
import { CardVector } from "ydeck";
import { Command, CommandDefinition, CommandSupport } from "../Command";
import { helpMessage } from "../config";
import { DatabaseTournament } from "../database/interface";
import { DatabaseWrapperPostgres } from "../database/postgres";
import { DeckManager } from "../deck";
import { ParticipantRoleProvider } from "../role/participant";
import { reply } from "../util/discord";
import { getLogger } from "../util/logger";
import { Public } from "../util/types";
import { WebsiteInterface } from "../website/interface";

const logger = getLogger("messageCreate");

export function makeHandler(
	bot: Client,
	prefix: string,
	commands: Record<string, CommandDefinition>,
	support: CommandSupport
): (msg: Message) => Promise<void> {
	const handlers: Record<string, Command> = {};
	for (const name in commands) {
		handlers[name] = new Command(commands[name]);
	}
	return async function messageCreate(msg: Message): Promise<void> {
		// Ignore messages from all bots and replies
		if (msg.author.bot || msg.reference) {
			return;
		}
		if (bot.user && msg.mentions.has(bot.user)) {
			await reply(msg, helpMessage).catch(logger.error);
			return;
		}
		if (msg.content.startsWith(prefix)) {
			const terms = msg.content.split(" ");
			const cmdName = terms[0].slice(prefix.length).toLowerCase();
			const args = terms
				.slice(1) // this works fine and returns an empty array if there's only 1 element in terms
				.join(" ")
				.split("|")
				.map(s => s.trim());
			await handlers[cmdName]?.run(msg, args, support);
		} else if (!msg.guildId) {
			// Checking guildID is likely more performant than instanceof
			await onDirectMessage(
				msg,
				support.database,
				support.decks,
				support.challonge,
				support.participantRole,
				bot
			).catch(logger.error);
		}
	};
}

function log(level: keyof typeof logger, msg: Message, payload: Record<string, unknown>): void {
	return logger[level](
		JSON.stringify({
			handle: `${msg.author.username}#${msg.author.discriminator}`,
			user: msg.author.id,
			message: msg.id,
			...payload
		})
	);
}

// The only allowed exceptions are final reply errors or initial database access failures
export async function onDirectMessage(
	msg: Message,
	database: Public<DatabaseWrapperPostgres>,
	decks: DeckManager,
	challonge: WebsiteInterface,
	participantRole: ParticipantRoleProvider,
	bot: Client
): Promise<void> {
	let tournaments = await database.getPendingTournaments(msg.author.id);
	if (tournaments.length > 1) {
		const out = tournaments.map(t => t.name).join(", ");
		log("info", msg, { event: "pending multiple", tournaments: out });
		await reply(
			msg,
			`You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\n${out}`
		);
		return;
	}
	if (tournaments.length === 1) {
		const tournament = tournaments[0];
		log("info", msg, {
			event: "confirm start",
			tournament: tournament.id,
			size: tournament.players.length,
			limit: tournament.limit
		});
		if (tournament.limit > 0 && tournament.players.length >= tournament.limit) {
			log("info", msg, { event: "confirm full", tournament: tournament.id });
			await reply(
				msg,
				`Sorry, **${tournament.name}** has reached its capacity of ${tournament.limit} registrations!`
			);
			return;
		}
		try {
			await verifyDeckAndConfirmPending(msg, tournament, database, decks, challonge, participantRole, bot);
		} catch (error) {
			log("info", msg, { event: "confirm fail", tournament: tournament.id, error: error.message });
			await reply(
				msg,
				`Must provide a valid attached \`.ydk\` file OR valid \`ydke://\` URL for **${tournament.name}**!`
			);
			await reply(msg, error.message);
		}
		return;
	}

	tournaments = await database.getConfirmedTournaments(msg.author.id);
	if (tournaments.length > 1) {
		const out = tournaments.map(t => t.name).join(", ");
		log("info", msg, { event: "confirmed multiple", tournaments: out });
		await reply(
			msg,
			`You're trying to update your deck for a tournament, but you're in multiple! Please choose one by dropping and registering again.\n${out}`
		);
		return;
	}
	if (tournaments.length === 1) {
		const tournament = tournaments[0];
		log("info", msg, { event: "update start", tournament: tournament.id });
		try {
			await verifyDeckAndUpdateConfirmed(msg, tournament, database, decks, bot);
		} catch (error) {
			log("info", msg, { event: "update fail", tournament: tournament.id, error: error.message });
			await reply(
				msg,
				`Must provide a valid attached \`.ydk\` file OR valid \`ydke://\` URL for **${tournament.name}**!`
			);
			await reply(msg, error.message);
		}
		return;
	}

	log("verbose", msg, { event: "no context", content: msg.content });
	await reply(
		msg,
		`${helpMessage}\nIf you're trying to sign up for a tournament, make sure you've clicked ✅ on a sign-up message and I'll let you know how to proceed.`
	);
}

// Throws on any problem with the deck, and the exception payload should be sent to the user
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function verifyDeck(msg: Message, decks: DeckManager, allowVector?: CardVector) {
	const [deck, errors] = await decks.getDeckFromMessage(msg, allowVector); // throws on network error, YDKParseError, bad YDKE URL, filesize too big
	const formattedDeckMessage = decks.prettyPrint(
		deck,
		`${msg.author.username}.${msg.author.discriminator}.ydk`,
		errors
	);
	if (errors.length > 0) {
		await reply(msg, ...formattedDeckMessage).catch(logger.error);
		throw new Error(
			`Your deck is not legal. Please see the print out for all the errors. You have NOT been registered yet, please submit again with a legal deck.`
		);
	}
	log("verbose", msg, { event: "valid" });
	return { deck, formattedDeckMessage };
}

// Should only throw exceptions from verifyDeck
async function verifyDeckAndConfirmPending(
	msg: Message,
	tournament: DatabaseTournament,
	database: Public<DatabaseWrapperPostgres>,
	decks: DeckManager,
	challonge: WebsiteInterface,
	participantRole: ParticipantRoleProvider,
	bot: Client
): Promise<void> {
	const { deck, formattedDeckMessage } = await verifyDeck(msg, decks, tournament.allowVector);
	const username = `${msg.author.username}#${msg.author.discriminator}`;
	try {
		const challongeId = await challonge.registerPlayer(tournament.id, username, msg.author.id);
		log("verbose", msg, { event: "challonge", tournament: tournament.id });
		await database.confirmPlayer(tournament.id, msg.author.id, challongeId, deck.url);
		log("verbose", msg, { event: "database", tournament: tournament.id });
	} catch (error) {
		logger.error(error);
		for (const channel of tournament.privateChannels) {
			await bot
				.createMessage(
					channel,
					`Something went really wrong while trying to register <@${msg.author.id}> (${username}) for **${tournament.name}**!`
				)
				.catch(logger.error);
		}
		await reply(msg, `Something went really wrong while trying to register for **${tournament.name}**!`).catch(
			logger.error
		);
		return;
	}
	let roleGrantWarning = "";
	try {
		await participantRole.grant(msg.author.id, tournament);
		log("verbose", msg, { event: "role", tournament: tournament.id });
	} catch (error) {
		logger.error(error);
		roleGrantWarning = " I couldn't assign them a role. Am I missing permissions?";
	}
	for (const channel of tournament.privateChannels) {
		try {
			await bot.createMessage(
				channel,
				`<@${msg.author.id}> (${username}) has signed up for **${tournament.name}** with the following deck!${roleGrantWarning}`
			);
			await bot.createMessage(channel, ...formattedDeckMessage);
		} catch (error) {
			logger.error(error);
		}
	}
	log("info", msg, { event: "confirm success", tournament: tournament.id });
	try {
		await reply(
			msg,
			`You have successfully signed up for **${tournament.name}**! Your deck is below to double-check. You may resubmit at any time before the tournament starts.`
		);
		await reply(msg, ...formattedDeckMessage);
	} catch (error) {
		logger.error(error);
	}
}

// Should only throw exceptions from verifyDeck
async function verifyDeckAndUpdateConfirmed(
	msg: Message,
	tournament: DatabaseTournament,
	database: Public<DatabaseWrapperPostgres>,
	decks: DeckManager,
	bot: Client
): Promise<void> {
	const { deck, formattedDeckMessage } = await verifyDeck(msg, decks, tournament.allowVector);
	const username = `${msg.author.username}#${msg.author.discriminator}`;
	try {
		await database.updateDeck(tournament.id, msg.author.id, deck.url);
		log("verbose", msg, { event: "database", tournament: tournament.id });
	} catch (error) {
		logger.error(error);
		for (const channel of tournament.privateChannels) {
			await bot
				.createMessage(
					channel,
					`Something went really wrong while trying to update deck of <@${msg.author.id}> (${username}) for **${tournament.name}**!`
				)
				.catch(logger.error);
		}
		await reply(msg, `Something went really wrong while trying to update deck for **${tournament.name}**!`).catch(
			logger.error
		);
		return;
	}
	for (const channel of tournament.privateChannels) {
		try {
			await bot.createMessage(
				channel,
				`<@${msg.author.id}> (${username}) has updated their deck for **${tournament.name}** to the following!`
			);
			await bot.createMessage(channel, ...formattedDeckMessage);
		} catch (error) {
			logger.error(error);
		}
	}
	log("info", msg, { event: "update success", tournament: tournament.id });
	try {
		await reply(
			msg,
			`You have successfully changed your deck for **${tournament.name}**! Your deck is below to double-check. You may resubmit at any time before the tournament starts.`
		);
		await reply(msg, ...formattedDeckMessage);
	} catch (error) {
		logger.error(error);
	}
}
