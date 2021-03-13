# Commands for tournament hosts

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)

Commands have a specific name exactly following the command prefix. If the command accepts parameters,
these are separated from each other by a pipe `|`, and from the command name by whitespace. For the
following, any words that are separated by `|` refer to the _name_ of the parameter, and you should
replace them with an appropriate value when you use these commands!

## Index

<!--
GitHub creates IDs for headings by replacing spaces with hyphens.
They may be truncated with length. Make sure to update these if you change a heading!
--->
### Main tournament workflow
1. [mc!create](#create-tournament)
1. [mc!addhost](#add-host)
1. [mc!addchannel public](#add-announcement-channel)
1. [mc!addchannel private](#add-announcement-channel)
1. [mc!open](#open-tournament-for-registrations)
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
1. [mc!update](#update-tournament-information)
1. [mc!removehost](#remove-host)
1. [mc!removechannel](#remove-announcement-channel)
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
commands for the next step of the [main tournament workflow](#main-tournament-workflow).

### Add host
```
mc!addhost id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` must be a valid Discord mention of a user that pings them.

The user is added as a host for the specified tournament, granting them the same permissions as you.

### Remove host
```
mc!removehost id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` must be a valid Discord mention of a user that pings them.

The user is deauthorised as a host for the specified tournament, losing all corresponding permissions.
You cannot remove yourself if you are the only host; there must always be one host to manage the tournament.

### Add announcement channel
```
mc!addchannel id|type
```
**Caller permission level**: host for the tournament identified by _id_

`type` must be either `private` or `public`. It may be omitted, in which case `public` is assumed.

The current channel is added as a channel of the specified type for the specified tournament.

Private channels are intended only for hosts and should not be visible to participants. Deck lists from registrations
are broadcast here, along with any diagnostic messages from tournament operation, like score submissions and drops.
Please monitor this channel during tournament operation in case of errors or warnings.

Public channels are where sign-up messages and new round announcements are posted. Make sure your
to-be participants and participants can read this channel! Participants will be role-pinged for each round.

At least one private and one public channel must be registered before opening a tournament for sign-ups.

### Remove announcement channel
```
mc!removechannel id|type
```
**Caller permission level**: host for the tournament identified by _id_

`type` must be either `private` or `public`. It may be omitted, in which case `public` is assumed.

If the current channel is registered for the specified tournament as a channel of the specified type,
it is removed and Emcee will no longer send announcement messages here. Please note that the type
must be correct as it was originally added via [`mc!addchannel`](#add-announcement-channel)!

### Update tournament information
```
mc!update id|name|description
```
**Caller permission level**: host for the tournament identified by _id_

The specified tournament be in the preparing stage and not have been started.
Updates the name and description for the tournament, affecting the Challonge page
and future sign-up messages.

### Open tournament for registrations
```
mc!open id
```
**Caller permission level**: host for the tournament identified by _id_

The specified tournament be in the preparing stage and not have been started.
If at least one private and one public channel have been registered for the specified tournament,
the tournament is opened for registration by posting a message with its name and description
in all public announcement channels. This message will have a ✅ reaction button for users
to click to begin the sign-up process.

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
