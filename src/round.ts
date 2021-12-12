import { Client, User, Util } from "discord.js";
import { CommandSupport } from "./Command";
import { DatabaseTournament, TournamentFormat } from "./database/interface";
import { getRound } from "./util/challonge";
import { dm, send } from "./util/discord";
import { UserError } from "./util/errors";
import { getLogger } from "./util/logger";
import { WebsiteWrapperChallonge } from "./website/challonge";

const logger = getLogger("round");

/**
 * Parses a duration in the form hh:mm OR mm.
 * @param time
 */
export function parseTime(time: string): number {
	const parts = time.split(":");
	switch (parts.length) {
		case 1: {
			const minutes = parseInt(time, 10);
			if (isNaN(minutes) || minutes < 0) {
				throw new UserError("Round timer must be the second parameter, in the form `mm` or `hh:mm`.");
			}
			return minutes;
		}
		case 2: {
			const hours = parseInt(parts[0], 10);
			const minutes = parseInt(parts[1], 10);
			const total = hours * 60 + minutes;
			if (isNaN(total) || total < 0) {
				throw new UserError("Round timer must be the second parameter, in the form `mm` or `hh:mm`.");
			}
			return total;
		}
		default:
			throw new UserError("Round timer must be the second parameter, in the form `mm` or `hh:mm`.");
	}
}

export async function advanceRoundDiscord(
	{ timeWizard, participantRole, challonge }: CommandSupport,
	bot: Client,
	tournament: DatabaseTournament,
	minutes: number,
	skip = false
): Promise<void> {
	await timeWizard.cancel(tournament.id);
	logger.info(JSON.stringify({ tournament: tournament.id, minutes, skip }));
	const matches = await challonge.getMatches(tournament.id, true);
	const round = getRound(tournament.id, matches);
	const intro = `Round ${round} of ${tournament.name} has begun!`;
	logger.info(JSON.stringify({ tournament: tournament.id, round }));
	const role = await participantRole.get(tournament);
	for (const channel of tournament.publicChannels) {
		await send(
			bot,
			channel,
			skip
				? `${intro} <@&${role}>\nPairings can be found here: https://challonge.com/${tournament.id}`
				: `${intro} <@&${role}>\nPairings will be sent out by Direct Message shortly, or can be found here: https://challonge.com/${tournament.id}`
		);
	}
	if (!skip) {
		const players = await getPlayers(challonge, tournament.id);
		logger.info(JSON.stringify({ tournament: tournament.id, players: players.size, matches: matches.length }));
		for (const match of matches) {
			const snowflake1 = players.get(match.player1);
			const snowflake2 = players.get(match.player2);
			if (snowflake1 && snowflake2) {
				// Naive check for an obviously invalid snowflake, such as the BYE# or DUMMY# we insert
				// This saves the overhead of an HTTP request
				const user1 = await getUser(bot, snowflake1);
				const user2 = await getUser(bot, snowflake2);
				logger.verbose(
					JSON.stringify({
						tournament: tournament.id,
						match: match.matchId,
						player1: snowflake1,
						player2: snowflake2,
						name1: user1?.tag,
						name2: user2?.tag
					})
				);
				await sendPairing(intro, user1, user2).catch(() =>
					reportFailure(bot, tournament, snowflake1, snowflake2)
				);
				await sendPairing(intro, user2, user1).catch(() =>
					reportFailure(bot, tournament, snowflake2, snowflake1)
				);
			} else {
				// This error occuring is an issue on Challonge's end
				logger.warn(
					new Error(
						`Challonge IDs ${match.player1} and/or ${match.player2} found in match ${match.matchId} but not the player list of ${tournament.id}.`
					)
				);
			}
			players.delete(match.player1);
			players.delete(match.player2);
		}
		if (tournament.format === TournamentFormat.SWISS && players.size) {
			for (const bye of players.values()) {
				try {
					await dm(bot, bye, `${intro} You have a bye for this round.`);
					logger.info(JSON.stringify({ tournament: tournament.id, bye }));
				} catch {
					await reportFailure(bot, tournament, bye, "natural bye");
				}
			}
			if (players.size > 1) {
				logger.warn(`${players.size} natural byes identified in ${tournament.id}`);
			}
		}
	}
	if (minutes > 0) {
		await timeWizard.start(
			tournament.id,
			tournament.publicChannels,
			new Date(Date.now() + minutes * 60 * 1000),
			`That's time in the round, <@&${role}>! Please follow appropriate time procedures as determined by your tournament hosts.`,
			5 // update every 5 seconds
		);
	}
}

/**
 * Retrieve a mapping of Challonge ID to Discord snowflake from Challonge.
 * We may also implement the part that requires this to read from our internal database instead.
 *
 * @param challonge
 * @param tournamentId
 */
async function getPlayers(challonge: WebsiteWrapperChallonge, tournamentId: string): Promise<Map<number, string>> {
	const raw = await challonge.getPlayers(tournamentId);
	const players = new Map();
	for (const player of raw) {
		if (player.active) {
			players.set(player.challongeId, player.discordId);
		}
	}
	return players;
}

async function getUser(bot: Client, snowflake: string): Promise<User | null> {
	// Naive check for an obviously invalid snowflake, such as the BYE# or DUMMY# we insert
	// This saves the overhead of an HTTP request
	if (!snowflake.length || snowflake[0] < "0" || snowflake[0] > "9") {
		return null;
	}
	return await bot.users.fetch(snowflake).catch(() => null);
}

async function sendPairing(intro: string, receiver: User | null, opponent: User | null): Promise<void> {
	if (receiver) {
		await receiver.send(
			opponent
				? `${intro} Your opponent is ${opponent} (${Util.escapeMarkdown(
						opponent.tag
				  )}). Make sure to report your score after the match is over!`
				: `${intro} I couldn't find your opponent. If you don't think you should have a bye for this round, please check the pairings.`
		);
	} else {
		throw new Error(`Receiver is null`);
	}
}

async function reportFailure(
	bot: Client,
	tournament: DatabaseTournament,
	userId: string,
	opponentId: string
): Promise<void> {
	for (const channel of tournament.privateChannels) {
		logger.info(JSON.stringify({ tournament: tournament.id, userId, opponentId, event: "direct message fail" }));
		await send(
			bot,
			channel,
			`I couldn't send a DM to <@${userId}> about their pairing for **${tournament.name}**. If they're not a human player, this is normal, but otherwise please tell them their opponent is <@${opponentId}>.`
		).catch(logger.error);
	}
}
