# Changelog

## 2021-02-21 ([Chalislime Monthly February 2021](https://challonge.com/csmfeb21))

### New Features
- Text updates to make the player guide clearer and cut down on questions.
- New round messages now say which round it is.
- When a player leaves the server they are automatically dropped from the tournament.
- When both players in a match drop during that round, the match score will be amended to a tie instead of a victory for whoever dropped last.
### Bug Fixes
- When a player submits a score to a match that's already closed (i.e. opponent has dropped), they're given an error message explaining instead of silently failing.
- Correctly send a DM to the player with the round bye telling them so.
- `mc!addbye`/`mc!removebye` commands print a correct read-out of which players currently have byes.
- `mc!forcescore` can correctly change the score of a match that's already been submitted to, as long as it's still in the same round.
- Cannot use `mc!addchannel`/`mc!removechannel` to add a channel other than the one the message is sent in, due to security concerns.

## 2021-01-05

- Users can drop themselves in the middle of a tournament using a command. Hosts can still also drop users using a command.
- Users can report scores for a match by using a command. Both users need to submit matching scores for it to be counted. Hosts can also report scores using a command by specifying the winner.
- Emcee can export CSV spreadsheets featuring a list of all players alongside the archetype of their deck (ideal for casting a match), a list of all deck archetypes alongside a count of how many there are of that archetype (ideal for making a pie chart), or a list of all players alongside their decklist (ideal for seeing how many of a card is played).
- Emcee outputs the Username#1234 with the decklist for easier searchability.
- Downloading YDK files should now work properly, hopefully, or it did already, it's not super clear.
- Emcee now has a new deck reading system that should have up-to-date lists and if necessary can be tweaked to allow a different set of allowed cards without needing a custom banlist that falls out of date.
- Players can now change their deck for a Tournament they're registered in by sending Emcee a new one, without dropping.
- At the start of a round, Emcee will post a 50:00 countdown timer that updates every 5 seconds. When it runs out, Emcee will ping all players and instruct them to conduct end of round procedures. Starting the next round early will cancel the previous timer.
- At the end of a Swiss tournament, Emcee will take the Top 8 players and put them into a single-elimination tournament automatically. This will be registered as a tournament that operates through Emcee as well.
- Emcee's deck reading system is set up to check decks for archetypes in a more structured manner, once we've decided what criteria to look for.
- Emcee can now be told to give certain players a round 1 bye. When the tournament starts, it will create dummy players and make sure players with byes are matched up to them and given a 2-0. Once the tournament has commenced, the dummy players will be dropped.
