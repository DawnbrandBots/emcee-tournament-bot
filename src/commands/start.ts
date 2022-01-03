import { CommandDefinition, CommandSupport } from "../Command";
import { DatabaseTournament, TournamentStatus } from "../database/interface";
import { findMatch } from "../util/challonge";
import { dm, send } from "../util/discord";
import { UserError } from "../util/errors";
import { getLogger } from "../util/logger";

const logger = getLogger("command:start");

const command: CommandDefinition = {
	name: "start",
	requiredArgs: ["id"],
	executor: async (msg, args, support) => {
		// Argument combinations:
		// id
		// id|timer
		// id|skip
		// id|timer|skip
		// 50 is the assumed default timer for live tournaments
		const [id] = args;
		const tournament = await support.database.authenticateHost(
			id,
			msg.author.id,
			msg.guildId,
			TournamentStatus.PREPARING
		);
		function log(event: string, payload?: Record<string, unknown>): string {
			return JSON.stringify({
				channel: msg.channelId,
				message: msg.id,
				user: msg.author.id,
				tournament: id,
				command: "start",
				event,
				...payload
			});
		}
		logger.verbose(log("attempt"));
		if (tournament.players.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		await msg.reply(":hammer: Working…");
		try {
			const { registerMessages, ejected } = await support.database.prestartTournament(id);
			logger.info(log("prestart"));
			for (const { channelId, messageId } of registerMessages) {
				try {
					const channel = await msg.client.channels.fetch(channelId);
					if (channel?.isText()) {
						await channel.messages.delete(messageId);
					} else {
						logger.warn(`Failed to delete ${channelId} ${messageId} since this is not a text channel`);
					}
				} catch (error) {
					logger.warn(error);
				}
			}
			logger.verbose(log("delete register messages"));
			for (const player of ejected) {
				await dm(
					msg.client,
					player,
					`Sorry, **${tournament.name}** has started and you didn't submit a deck, so you have been dropped.`
				).catch(logger.info);
			}
			logger.verbose(log("notify ejected"));
			await support.challonge.shufflePlayers(id); // must happen before byes assigned!
			logger.verbose(log("shuffle players"));
			await assignByes(id, tournament, support);
			logger.info(log("assign byes"));
			await support.challonge.startTournament(id);
			logger.info(log("challonge"));
			await support.database.startTournament(id);
			logger.verbose(log("database"));
			await msg.reply(
				`**${tournament.name}** commenced on Challonge! Use \`mc!round ${id}\` to send out pairings and start the timer for round 1.`
			);
		} catch (err) {
			logger.error(err);
			await msg.reply(`Something went wrong in preflight for **${tournament.name}**. Please try again later.`);
			return;
		}
		// send command guide to players
		for (const channel of tournament.publicChannels) {
			await send(msg.client, channel, support.templater.format("player", id)).catch(logger.error);
		}
		logger.verbose(log("public"));
		// send command guide to hosts
		for (const channel of tournament.privateChannels) {
			await send(msg.client, channel, support.templater.format("start", id)).catch(logger.error);
		}
		logger.verbose(log("private"));

		// drop dummy players once the tournament has started to give players with byes the win

		const players = await support.challonge.getPlayers(id);
		for (let i = 0; i < tournament.byes.length; i++) {
			const player = players.find(p => p.discordId === `BYE${i}`);
			/* One would think we could assert non-null here because we made these players,
			   However, if N + B even (see above comments), BYE${numByes} won't exist,
			   and this is simpler than calculating that again.
			   This also neatly handles edge cases like a bye player being manually dropped. */
			if (player) {
				const match = await findMatch(id, player.challongeId, support.challonge);
				/* We assume the match will exist and be open since the tournament just started
				   But checking handles edge cases like a human theoretically changing the score before Emcee can
				   Considering how slow the startTournament function is, that's not impossible */
				if (match) {
					const winner = match.player1 === player.challongeId ? match.player2 : match.player1;
					await support.challonge.submitScore(id, match, winner, 2, 0);
				}
				await support.challonge.removePlayer(id, player.challongeId);
			}
		}

		logger.info(log("success"));
	}
};

async function assignByes(id: string, tournament: DatabaseTournament, support: CommandSupport): Promise<void> {
	// assign byes
	const playersToBye = tournament.byes.slice(0); // shallow copy to sever reference for when we pop
	if (playersToBye.length < 1) {
		return;
	}

	const playerArray = await support.challonge.getPlayers(id);
	const players = new Map(playerArray.map(p => [p.discordId, p]));

	// sort players with byes by their seed so that their paths don't cross when we change their seed
	playersToBye.sort((a, b) => (players.get(a)?.seed || 0) - (players.get(b)?.seed || 0));

	const numPlayers = players.size;
	const numToBye = playersToBye.length;
	/* With 1 bye left to distribute, if the current number of players is even, we need to add another player
   This will have the consequence later of a floating natural bye we want to assign to a player not involved with byes
   If the current number of players is odd, we have the natural bye to use and can assign it to a player with a bye
   So in that case, we don't want to add that last player.
   The current number of players with 1 bye left is N + B - 1, which has opposite parity to N + B.
   Hence if N + B is even, we don't have to add the last player, and if it's odd, we need to handle the natural bye later. */
	const isSumEven = (numPlayers + numToBye) % 2 === 0;
	const numByes = numToBye - (isSumEven ? 1 : 0);
	const byePlayers = [];
	for (let i = 0; i < numByes; i++) {
		byePlayers.push(await support.challonge.registerPlayer(id, `Round 1 Bye #${i + 1}`, `BYE${i}`));
	}

	const maxSeed = numPlayers + numByes; // This value is always odd due to the N + B maths above.
	// Here we assign the natural bye to an appropriate player if we can.
	if (isSumEven) {
		// we've checked the length is >0 so pop can't return undefiend
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const lastPlayerDiscord = playersToBye.pop()!; // modifying this array won't have long-term consequences on the database
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const lastPlayer = players.get(lastPlayerDiscord)!;
		await support.challonge.setSeed(id, lastPlayer.challongeId, maxSeed);
		// this may have been the only bye, in which case we're mercifully done
		if (playersToBye.length < 1) {
			return;
		}
	}

	// ensure all human players are in top half of the list, which after will remain constant
	const topSeeds = [];
	for (let i = 0; i < playersToBye.length; i++) {
		/* We assign to the low end of the top half to minimise an unfair boost to tiebreakers,
	   but assign from top to bottom to ensure they don't push each other into the bottom half.
	   We floor because we always want the algorithm to ignore the odd max seed.
	   If N + B is odd we've put something there, and if N + B is even we want something to be left there. */
		const newSeed = Math.floor(maxSeed / 2) - playersToBye.length + i + 1;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const player = players.get(playersToBye[i])!;
		let seed = player.seed;
		// no need to disturb their seed if they're already in place
		if (seed > newSeed) {
			await support.challonge.setSeed(id, player.challongeId, newSeed);
			seed = newSeed;
		}
		topSeeds.push(seed);
	}

	// should be same as number of byePlayers, given that if N + B even we've knocked one out of that array
	for (let i = 0; i < topSeeds.length; i++) {
		/* Since the topSeeds are all in the top half, we know adding half the max will stay in bounds.
	   We set the seeds from top to bottom since we're moving from the bottom,
	   this means they won't disturb anything above where they land.
	   This is only true because we sorted the players by seed initially.
	   Things below where they land are either going to be moved themselves or don't matter.
	   In particular, if N + B is even we want something to be moved down to the natural bye. */
		const oppSeed = topSeeds[i] + Math.floor(maxSeed / 2);
		// we've set discord IDs to this
		await support.challonge.setSeed(id, byePlayers[i], oppSeed);
	}
}

export default command;
