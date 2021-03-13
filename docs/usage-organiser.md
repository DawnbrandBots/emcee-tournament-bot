# Commands for tournament hosts

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)

`|` are literal parameter separators.

## Create tournament
Usage: `mc!create name|description`

Permissions: Organiser

This command creates a new tournament, with the specified name and description. The description is what will appear when the tournament is opened for registration, so it should be fairly detailed. The tournament will be hosted on Challonge, and Emcee will respond with a link to the page.
## Update tournament information
Usage: `mc!update id|name|description`

Updates the name and description of the given tournament before it is opened for registration.
## Add announcement channel
Usage: `mc!addchannel id|type|#channel`

Permissions: Host

Records a Discord channel for the given tournament where announcements will be sent. If `type` is "private", then it will be a private channel intended only for hosts, where the decklists of registered users are sent. If it is anything else or left off, it will be a public channel where sign-up and new round announcements are posted. #channel should be a mention of a valid Discord text channel if it is provided, however, it is optional and if no such mention is found Emcee will add the current channel the command was sent in.

## Remove announcement channel
Usage: `mc!removechannel id|type|#channel`

Permissions: Host

Removes an announcement channel for the given tournament, as was added by the above command. As with the above command, if `type` is not specified as "private", Emcee will assume you are trying to remove a public channel. As with the above command, #channel should be a mention of a valid Discord text channel if it is provided, however, it is optional and if no such mention is found Emcee will remove the current channel the command was sent in.

## Add host
Usage: `mc!addhost id|@user` OR `mc!addorganizer id|@user`

Permissions: Host

Adds the mentioned user as a host for the given tournament, authorising them to use management commands for it. `@user` should be a valid Discord mention of a user.

## Remove host
Usage: `mc!removehost id|@user` OR `mc!removeorganizer id|@user`

Permissions: Host

Removes the mentioned user as a host from the given tournament, deauthorising them to use management commands for it. `@user` should be a valid Discord mention of a user. You cannot remove yourself.

## Open tournament
Usage: `mc!open id`

Permissions: Host

Opens the given tournament for registration, by posting a message with its name and description in all public announcement channels, and adding a "✅" reaction that users can click to begin the registration process.
## Start tournament
Usage: `mc!start id`

Permissions: Host

Starts the given tournament once it is open for registration. This removes all pending participants, that have checked the "✅" but not submitted a valid deck, deletes the registration message from all public announcement channels, changes the status of the tournament on Challonge to "in progress", and posts the announcement for the first round to all public announcement channels.

## Cancel tournament
Usage: `mc!cancel id`

Permissions: Host

Cancels the given tournament. This removes the participant role in each server, changes the status of the tournament on Challonge to "finished", and posts an announcement that the tournament is over to all public announcement channels. To end the tournament naturally, instead use the "next round" command during the final round.

## Submit score
Usage: `mc!score id|score|@winner`

Permissions: Host

Records a score for the current round of the given tournament. `@winner` should be a valid Discord mention of the user who won the match. If it is a tie, do not record the score with this command and it will automatically be handled upon proceeding to the next round. The score should be reported in the format `#-#`, e.g. `2-1`, with the winner's score first.

## Proceed to the next round
Usage: `mc!round id`

Permissions: Host

Proceeds to the next round of the given tournament. This records all outstanding matches for the round as a tie and sends a message announcing the next round to all public announcement channels. If it was the final round, it concludes the tournament, removing the participant role in each server, changing the status of the tournament on Challonge to "finished", and posting an announcement that the tournament is over to all public announcement channels.

## List ongoing tournaments
Usage: `mc!list`

Permissions: Organiser

Provides a list of all ongoing tournaments, with their IDs, names, status and participant counts.

## List tournament participants
Usage: `mc!players id`

Permissions: Host

Provides a list of all confirmed participants in the given tournament.

## Show participant deck
Usage: `mc!deck id|@user`

Permissions: Host

Reposts the deck profile for the given user in the given tournament. `@user` should be a valid Discord mention of a user playing in the tournament.

## Drop participant
Usage: `mc!drop id|@user`

Permissions: Host

Removes the mentioned user from participating in the given tournament. `@user` should be a valid Discord mention of a user playing in the tournament.

## Synchronise tournament info
Usage: `mc!sync id`

Permissions: Host

Synchronises tournament data by querying the Challonge API. Run this any time you make changes to a tournament on the Challonge website without going through Emcee.

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)
