# Commands for tournament hosts

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)

Commands have a specific name exactly following the command prefix. If the command accepts parameters,
these are separated from each other by a pipe `|`, and from the command name by whitespace. For the
following, any words that are separated by `|` refer to the _name_ of the parameter, and you should
replace them with an appropriate value when you use these commands!

## Index

### Main tournament workflow
1. [mc!create](#create-tournament)
1. mc!addhost
1. mc!addchannel
1. mc!addchannel private
1. mc!open
1. mc!start
1. mc!round
1. mc!finish
1. mc!topcut

### Tournament administration
1. mc!forcescore
1. mc!forcedrop
1. mc!cancel

### Informational
1. mc!deck
1. mc!players
1. mc!dump
1. mc!pie

### Before starting a tournament
1. mc!update
1. mc!removehost
1. mc!removechannel
1. mc!addbye
1. mc!removebye

## Reference

### List ongoing tournaments
```
mc!list
```
**Caller permission level**: MC-TO role

Responds with a list of all preparing and in progress tournaments, including their IDs, names, status, and participant counts.

### Create tournament
```
mc!create name|description
```
**Caller permission level**: MC-TO role

Creates a new tournament. Emcee will create the tournament on Challonge with the specified name and description.
The description is will also be displayed by Emcee when the tournament is opened for registration,
so it should be fairly detailed.

Emcee will respond with a link to the Challonge page and an ID for the tournament to use with future commands,
which is generated from the provided name for the tournament. It will also respond with a guide for recommended
commands for the next step.

### Update tournament information
Usage: `mc!update id|name|description`

Updates the name and description of the given tournament before it is opened for registration.
### Add announcement channel
Usage: `mc!addchannel id|type`

Permissions: Host

Records the channel the message is sent in as a Discord channel for the given tournament where announcements will be sent. If `type` is "private", then it will be a private channel intended only for hosts, where the decklists of registered users are sent. If it is anything else or left off, it will be a public channel where sign-up and new round announcements are posted.

### Remove announcement channel
Usage: `mc!removechannel id|type`

Permissions: Host

Removes the channel the message is sent in as an announcement channel for the given tournament, as was added by the above command. As with the above command, if `type` is not specified as "private", Emcee will assume you are trying to remove a public channel.

### Add host
Usage: `mc!addhost id|@user` OR `mc!addorganizer id|@user`

Permissions: Host

Adds the mentioned user as a host for the given tournament, authorising them to use management commands for it. `@user` should be a valid Discord mention of a user.

### Remove host
Usage: `mc!removehost id|@user` OR `mc!removeorganizer id|@user`

Permissions: Host

Removes the mentioned user as a host from the given tournament, deauthorising them to use management commands for it. `@user` should be a valid Discord mention of a user. You cannot remove yourself.

### Open tournament
Usage: `mc!open id`

Permissions: Host

Opens the given tournament for registration, by posting a message with its name and description in all public announcement channels, and adding a "✅" reaction that users can click to begin the registration process.
### Start tournament
Usage: `mc!start id`

Permissions: Host

Starts the given tournament once it is open for registration. This removes all pending participants, that have checked the "✅" but not submitted a valid deck, deletes the registration message from all public announcement channels, changes the status of the tournament on Challonge to "in progress", and posts the announcement for the first round to all public announcement channels.

### Cancel tournament
Usage: `mc!cancel id`

Permissions: Host

Cancels the given tournament. This removes the participant role in each server, changes the status of the tournament on Challonge to "finished", and posts an announcement that the tournament is over to all public announcement channels. To end the tournament naturally, instead use the "next round" command during the final round.

### Submit score
Usage: `mc!score id|score|@winner`

Permissions: Host

Records a score for the current round of the given tournament. `@winner` should be a valid Discord mention of the user who won the match. If it is a tie, do not record the score with this command and it will automatically be handled upon proceeding to the next round. The score should be reported in the format `#-#`, e.g. `2-1`, with the winner's score first.

### Proceed to the next round
Usage: `mc!round id`

Permissions: Host

Proceeds to the next round of the given tournament. This records all outstanding matches for the round as a tie and sends a message announcing the next round to all public announcement channels. If it was the final round, it concludes the tournament, removing the participant role in each server, changing the status of the tournament on Challonge to "finished", and posting an announcement that the tournament is over to all public announcement channels.

### List tournament participants
Usage: `mc!players id`

Permissions: Host

Provides a list of all confirmed participants in the given tournament.

### Show participant deck
Usage: `mc!deck id|@user`

Permissions: Host

Reposts the deck profile for the given user in the given tournament. `@user` should be a valid Discord mention of a user playing in the tournament.

### Drop participant
Usage: `mc!drop id|@user`

Permissions: Host

Removes the mentioned user from participating in the given tournament. `@user` should be a valid Discord mention of a user playing in the tournament.

### Synchronise tournament info
Usage: `mc!sync id`

Permissions: Host

Synchronises tournament data by querying the Challonge API. Run this any time you make changes to a tournament on the Challonge website without going through Emcee.

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)
