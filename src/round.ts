import { CommandSupport } from "./Command";
import { DatabaseTournament } from "./database/interface";
import { DiscordInterface } from "./discord/interface";
import { getLogger } from "./util/logger";
import { WebsiteInterface } from "./website/interface";

const logger = getLogger("round");

export async function advanceRoundDiscord(
	{ timeWizard, participantRole, challonge, discord }: CommandSupport,
	tournament: DatabaseTournament,
	time: string,
	skip = false
): Promise<void> {
	await timeWizard.cancel(tournament.id);
	const role = await participantRole.get(tournament);
	const matches = await challonge.getMatches(tournament.id);
	const round = await challonge.getRound(tournament.id, matches);
	const intro = `Round ${round} of ${tournament.name} has begun!`;
	for (const channel of tournament.publicChannels) {
		await discord.sendMessage(
			channel,
			`${intro} <@&${role}>\nPairings will be sent out by Direct Message shortly, or can be found here: https://challonge.com/${tournament.id}`
		);
	}
	if (skip) {
		return;
	}
	const players = await getPlayers(challonge, tournament.id);
	for (const match of matches) {
		const player1 = players.get(match.player1);
		const player2 = players.get(match.player2);
		if (player1 && player2) {
			const name1 = await getRealUsername(discord, player1);
			const name2 = await getRealUsername(discord, player2);
			if (name1) {
				await sendPairing(discord, intro, player1, player2, name2, tournament);
			} else {
				await reportFailure(discord, tournament, player1, player2);
			}
			if (name2) {
				await sendPairing(discord, intro, player2, player1, name1, tournament);
			} else {
				await reportFailure(discord, tournament, player2, player1);
			}
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
	if (players.size) {
		for (const bye of players.values()) {
			try {
				await discord.sendDirectMessage(bye, `${intro} You have a bye for this round.`);
			} catch {
				await reportFailure(discord, tournament, bye, "natural bye");
			}
		}
		if (players.size > 1) {
			logger.warn(`${players.size} natural byes identified in ${tournament.id}`);
		}
	}
	await timeWizard.start(
		tournament.id,
		tournament.publicChannels,
		new Date(Date.now() + 50 * 60 * 1000), // 50 minutes
		`That's time in the round, <@&${role}>! Please end the current phase, then the player with the lower LP must forfeit!`,
		5 // update every 5 seconds
	);
}

/**
 * Retrieve a mapping of Challonge ID to Discord snowflake from Challonge.
 * We may also implement the part that requires this to read from our internal database instead.
 *
 * @param challonge
 * @param tournamentId
 */
async function getPlayers(challonge: WebsiteInterface, tournamentId: string): Promise<Map<number, string>> {
	const raw = await challonge.getPlayers(tournamentId);
	const players = new Map();
	for (const player of raw) {
		players.set(player.challongeId, player.discordId);
	}
	return players;
}

function notSnowflake(userId: string): boolean {
	return !userId.length || userId[0] <= "0" || userId[0] >= "9";
}

async function getRealUsername(discord: DiscordInterface, userId: string): Promise<string | null> {
	// Naive check for an obviously invalid snowflake, such as the BYE# or DUMMY# we insert
	// This saves the overhead of an HTTP request
	if (notSnowflake(userId)) {
		return null;
	}
	return await discord.getRESTUsername(userId);
}

async function sendPairing(
	discord: DiscordInterface,
	intro: string,
	receiverId: string,
	opponentId: string,
	opponentName: string | null,
	tournament: DatabaseTournament
): Promise<void> {
	try {
		await discord.sendDirectMessage(
			receiverId,
			opponentName
				? `${intro} Your opponent is <@${opponentId}> (${opponentName}). Make sure to report your score after the match is over!`
				: `${intro} I couldn't find your opponent. If you don't think you should have a bye for this round, please check the pairings.`
		);
	} catch {
		await reportFailure(discord, tournament, receiverId, opponentId);
	}
}

async function reportFailure(
	discord: DiscordInterface,
	tournament: DatabaseTournament,
	userId: string,
	opponentId: string
): Promise<void> {
	for (const channel of tournament.privateChannels) {
		await discord
			.sendMessage(
				channel,
				`I couldn't send a DM to <@${userId}> about their pairing for **${tournament.name}**. If they're not a human player, this is normal, but otherwise please tell them their opponent is <@${opponentId}>.`
			)
			.catch(logger.error);
	}
}