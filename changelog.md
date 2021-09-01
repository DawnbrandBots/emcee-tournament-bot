# Changelog

## HEAD

Move GitHub repository to the Dawnbrand Bots organization

### New Features
- Switch to Discord.js from Eris so we can make use of recent Discord features (#325)

### Bug Fixes
- Fix all file attachments breaking due to the switch to Discord.js, breaking two commands and part of registration (#327)
- Do not respond to `@everyone` and `@here`, another effect of the change to Discord.js (#330)
- Fix register messages being deleted on bot startup (#332)

## 2021-07-31 ([Chalislime Monthly July 2021](https://challonge.com/csmjuly2021))
### New Features
- `mc!dump`, `mc!players` and `mc!pie` have been merged into one command, `mc!csv`. (#303)
- Participant limits are enforced (#313)
- Add `mc!info` to display a pretty embed of all relevant information (#314)
- Add command `mc!capacity` to read and set the participant limit of preparing tournaments (#315)
- `mc!cancel` has been merged into `mc!finish`, with messaging changed to account for early finishes being a regular occurence. (#318)
- Add `mc!tb` to check and configure the tie-breaker settings for a tournament. (#319)
- Tournaments are identified in command responses with a consistent bold name. (#320)

### Bug Fixes
- Usernames printed in Discord will have markdown elements escaped, so they appear as written. (#304)
- Fix fatal out-of-memory crashes on tournament start (#306)

## 2021-06-27 ([Chalislime Monthly June 2021](https://challonge.com/csmjune2021))

### New Features
- Enable configuring custom card pools through `mc!banlist` (#290)
- If submitted scores disagree, the first submitter is notified (#296)

### Bug Fixes
- Restore tie command (#287)
- `mc!dump`, `mc!players` retrieve usernames if not already cached (#295)
- Parse mentions without internal `!` for forcedrop and removehost (#300)
- Interim patch for double drop silent failures (#301)

## 2021-05-28 ([Chalislime Monthly May 2021](https://challonge.com/csmmay2021))

### New Features
- Submitted YDK files must now come in under a file size cap, for security. (#278)

### Bug Fixes
- Deck lists in private channels no longer display as "your deck". (#280)
- Alternate artworks and other aliased cards are treated as the same card. (#280)
- Guides for top cut now use the correct tournament id. (#282)

## 2021-05-06 ([Chalislime Monthly April 2021](https://challonge.com/csmapr2021))

### New Features
- Deck resubmission policy is explicitly stated on submission. This was a frequently-asked question. (#230)
- `mc!topcut` supports arbitrary size top cuts instead of specifically 8. The size is now required. (#231)
- `mc!removehost` supports IDs to allow removing hosts who leave the server. (#234)
- Responses use Discord replies where possible (#235)
- Player seeds are shuffled before starting a tournament so that early sign-ups are not given an arbitrary advantage by their seed. (#266)
- Apply a temporary fix to allow ANGU cards in decks.

### Bug Fixes
- Fix a typo in `mc!forcedrop` success message where it indicated confirmed participants were pending. (#236)
- Fix a bug with users with IDs starting with 9 not receiving pairing direct messages. (#237)
- Host commands can no longer be run in direct messages or other servers. (#223)
- Participant commands can only be run in direct messages or the same server. (#238)
- Tournaments can no longer be modified or dropped from after they finish. (#248)
- Round 1 byes should now be assigned to the correct players consistently. (#249)
- Fix a bug with register messages not being deleted and dropped pending players not being notified on tournament start (#259)
- Fix eliminated players in top cut receiving direct messages about having a bye. (#260)

## 2021-03-28 ([Chalislime Monthly March 2021](https://challonge.com/csmmar21))

### New Features
- Emcee reports its current version in the `mc!help` command.
- Starting the timer and sending the pairing for round 1 no longer happens automatically after `mc!start` and requires a manual call of `mc!round`. This is to allow for intervention if something goes wrong with the start process, before telling players to play.
- Creating the Top Cut for a tournament is a separate `mc!topcut` command that can be called on a tournament after `mc!finish` is used. This allows taking a break between the end of Swiss and the start of Top Cut.
- New `mc!tie` command changes all open matches in the current round to a tie. This is useful when a number of matches are outstanding at the end of a round or tournament.
- A custom timer length can now be specified for `mc!round`.
- Documentation is now up-to-date in this repository, replacing the wiki.
### Bug Fixes
- The behaviour of dropping a player is now more reliable and consistent between a player using a command, a player unchecking their reaction, a host using `mc!forcedrop`, and a player leaving the server.
- Deck submission should be more reliable and report errors.
- Correctly identifies the natural bye, where it previously thought dropped players were still in the running.
- Misc. stability updates including tournament commencement and identifying byes.

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
