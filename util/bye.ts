function assignByes(playersToBye: string[], players: string[]): string[] {
	if (playersToBye.length < 1) {
		return players;
	}

	const numPlayers = players.length;
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
		players.push(`Round 1 Bye #${i + 1}`);
		byePlayers.push(`Round 1 Bye #${i + 1}`);
	}

	const maxSeed = numPlayers + numByes; // This value is always odd due to the N + B maths above.
	// Here we assign the natural bye to an appropriate player if we can.
	if (isSumEven) {
		// we've checked the length is >0 so pop can't return undefiend
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const lastPlayer = playersToBye.pop()!; // modifying this array won't have long-term consequences on the database
		players.splice(players.indexOf(lastPlayer), 1);
		players.splice(maxSeed, 0, lastPlayer);
		// this may have been the only bye, in which case we're mercifully done
		if (playersToBye.length < 1) {
			return players;
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
		const player = playersToBye[i];
		let seed = players.indexOf(player);
		// no need to disturb their seed if they're already in place
		if (seed > newSeed) {
			players.splice(seed, 1);
			players.splice(newSeed, 0, player);
			seed = newSeed;
		}
		topSeeds.push(seed);
	}

	// should be same as number of byePlayers, given that if N + B even we've knocked one out of that array
	for (let i = 0; i < topSeeds.length; i++) {
		/* Since the topSeeds are all in the top half, we know adding half the max will stay in bounds.
		   We set the seeds from top to bottom since we're moving from the bottom,
		   this means they won't disturb anything above where they land.
		   Things below where they land are either going to be moved themselves or don't matter.
		   In particular, if N + B is even we want something to be moved down to the natural bye. */
		const oppSeed = topSeeds[i] + Math.floor(maxSeed / 2);
		// we've set discord IDs to this
		players.splice(players.indexOf(byePlayers[i]));
		players.splice(oppSeed, 0, byePlayers[i]);
	}

	return players;
}

function generatePlayers(playerCt: number): string[] {
	const players = [];
	for (let i = 1; i <= playerCt; i++) {
		players.push(i.toString());
	}
	return players;
}

function matchups(players: string[]): string[] {
	const matches = [];
	const threshold = Math.floor(players.length / 2);
	for (let i = 0; i < threshold; i++) {
		matches.push(`${players[i]} vs ${players[i + threshold]}`);
	}
	if (players.length % 2 === 1) {
		matches.push(`Bye for ${players[players.length - 1]}`);
	}
	return matches;
}

function go(playerCt: number, byes: string[]): void {
	console.log(`${playerCt} Players, Byes: ${byes}`);
	const players = generatePlayers(playerCt);
	// const origMatches = matchups(players);
	const newPlayers = assignByes(byes, players);
	const newMatches = matchups(newPlayers);
	console.dir(newMatches);
}

go(125, ["10", "25", "68", "90"]);
go(125, ["10", "25", "68", "90", "102"]);
