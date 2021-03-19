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
1. [mc!start](#start-tournament)
1. [mc!round](#proceed-to-the-next-round)
1. [mc!finish](#finish-tournament)
1. [mc!topcut](#start-top-cut-tournament)

### Tournament administration
1. [mc!forcescore](#override-score)
1. [mc!forcedrop](#drop-participant)
1. [mc!cancel](#cancel-tournament)
1. [mc!tie](#tie-round)

### Informational
1. [mc!deck](#show-participant-deck)
1. [mc!players](#list-participants-with-deck-themes)
1. [mc!dump](#list-participants-with-deck-lists)
1. [mc!pie](#count-participants-by-deck-themes)

### Before starting a tournament
1. [mc!update](#update-tournament-information)
1. [mc!removehost](#remove-host)
1. [mc!removechannel](#remove-announcement-channel)
1. [mc!addbye](#add-artificial-round-one-bye)
1. [mc!removebye](#remove-artificial-round-one-bye)

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

The specified tournament must be in the preparing stage and not have been started.
Updates the name and description for the tournament, affecting the Challonge page
and future sign-up messages.

### Open tournament for registrations
```
mc!open id
```
**Caller permission level**: host for the tournament identified by _id_

The specified tournament must be in the preparing stage and not have been started.
If at least one private and one public channel have been registered for the specified tournament,
the tournament is opened for registration by posting a message with its name and description
in all public announcement channels. This message will have a ✅ reaction button for users
to click to begin the sign-up process.

### Add artificial round-one bye
```
mc!addbye id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` must be a valid Discord mention of a user that pings them.

The specified tournament must be in the preparing stage and not have been started.
If the specified user has confirmed their deck for the specified tournament, they will now
receive a free win in round 1 of Swiss. This may end up adding more rounds to the
tournament on Challonge than expected for a standard Swiss tournament, because this is
implemented by adding a fake player that immediately drops when round 1 begins, so
in that event, you should [tie](#tie-round) the extra final round.

### Remove artificial round-one bye
```
mc!removebye id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` must be a valid Discord mention of a user that pings them.

The specified tournament must be in the preparing stage and not have been started.
If the specified user has confirmed their deck for the specified tournament and was
assigned a round-one bye per the [above command](#add-artificial-round-one-bye),
the round-one bye is removed.

### Start tournament
```
mc!start id
```
**Caller permission level**: host for the tournament identified by _id_

The specified tournament must be in the preparing stage. Removes all pending participants
who started the sign-up process but did not submit a deck, deletes all
registration messages created by [`mc!open`](#open-tournament-for-registrations),
and changes the status of the tournament on Challonge to "in progress". While the first round
automatically begins on Challonge, and Challonge will automatically advance rounds without waiting for
explicit human intervention, Emcee does not announce the first round until you explicitly run the
following command.

### Proceed to the next round
```
mc!round id|timer|skip
```
**Caller permission level**: host for the tournament identified by _id_

Both the `timer` and `skip` parameters are optional.

The round timer defaults to 50 minutes and must be of the form `mm` or `hh:mm`.
An explicit zero timer results in no timer.

The skip parameter must come after the timer parameter if provided and be exactly `skip`.
It skips sending pairings in DMs.

If the tournament is in progress, stop all previous round timers for the tournament.
Announce to all public channels the current round and the Challonge hyperlink.

Pairings, round-one byes, and natural byes are sent out to each participant in
direct messages if `skip` is not specified. This may take some time due to Discord API
rate limits. Any problems are reported to private channels, such as blocked DMs.

Finally, a round timer message is sent out to all public channels if not explicitly
zeroed. It will count down every five seconds. When the timer reaches 0, a follow-up
announcement will ping all participants that the round is over. Hosts may trigger
the next round or run this command again regardless of the state of the timer.

Please note that this does not advance the round on Challonge. Challonge will
automatically advance rounds without waiting for explicit human intervention.
This command is exclusively for announcing the start of rounds and starting the
timer so participants play in regulation.

### Finish tournament
```
mc!finish id
```
**Caller permission level**: host for the tournament identified by _id_

If the tournament is in progress and all scores for every round have been submitted,
the tournament is marked as finished on Challonge. All round timers are stopped.
An announcement is sent to all public channels, pinging all participants, and then
the participant role for this tournament is deleted.

### Start top cut tournament
```
mc!topcut id
```
**Caller permission level**: host for the tournament identified by _id_

If the tournament is finished and has more than eight participants, a new single-elimination
top cut tournament is started on Challonge with the top eight participants. The same
hosts, decks, and announcement channels are retained, and a new participant role
is granted to these users.

This should be called as soon as possible after [`mc!finish`](#finish-tournament),
breaks permitting, lest any participants leave the server.

### Cancel tournament
```
mc!cancel id
```
**Caller permission level**: host for the tournament identified by _id_

If the tournament is in progress, the tournament is marked as finished on Challonge
and Emcee. All round timers are stopped. An announcement is sent to all public channels, pinging all participants, and then the participant role for this tournament is deleted.
The tournament is not restartable.

### Tie round
```
mc!tie id
```
**Caller permission level**: host for the tournament identified by _id_

If the tournament is in progress, sets the score for all outstanding matches in the
current round to a `0-0` draw. Challonge will automatically advance to the next round,
if any. This is mostly useful for skipping extra final rounds induced by
[artificial round-one byes](#add-artificial-round-one-bye) or calling the tournament
early without cancelling.

### Override score
```
mc!forcescore id|score|@winner
```
**Caller permission level**: host for the tournament identified by _id_

`score` must be of the form `#-#`, e.g. `2-1`, with the winner's score first.

`@winner` must be a valid Discord mention of a user that pings them.

If the tournament is in progress and the user tagged is a participant, the score
for the last match involving the participant is set to `score`, in their favour.
Draws can also be specified, in which case the mention can be either participant.

This command can submit both outstanding scores and overwrite already-submitted ones.
Please note that if the winner's score is lower, Challonge will happily accept
the match outcome, as if playing golf.

### Drop participant
```
mc!forcedrop id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` can be a Discord mention, though it does not have to ping, or the user's ID.

If the specified user exists and is pending or confirmed for the specified tournament,
they are dropped. Pending participants are removed from the queue and confirmed participants
are unconfirmed. If the tournament is in progress, the match is automatically forfeit to
the opponent `2-0` unless they have also dropped, in which case it is amended to a `0-0` draw.

The participant is informed of the removal via direct message.

### Show participant deck
```
mc!deck id|@user
```
**Caller permission level**: host for the tournament identified by _id_

`@user` can be a Discord mention, though it does not have to ping, or the user's ID.

Reposts the deck profile for the mentioned user if they are confirmed for this tournament.

### List participants with deck themes
```
mc!players id
```
**Caller permission level**: host for the tournament identified by _id_

Generates a CSV of the form
```csv
Player,Theme
User#0000,DetectedTheme1/DetectedTheme2
User2#0000,No themes
```

### List participants with deck lists
```
mc!dump id
```
**Caller permission level**: host for the tournament identified by _id_

Generates a CSV of the form
```csv
Player,Deck
User#0000,Main: Card 1, Card 2, Extra: Card 3, Card 4, Side: Card 5, Card 6
```

### Count participants by deck themes
```
mc!pie id
```
**Caller permission level**: host for the tournament identified by _id_

Generates a CSV of the form
```csv
Theme,Count
DetectedTheme1,2
DetectedTheme1/DetectedTheme2,1
No themes,1
```

### Synchronise tournament info
```
mc!sync id
```
**Caller permission level**: host for the tournament identified by _id_

Synchronises the tournament name, description, and participant list stored in
Emcee with those stored in the Challonge API. Useful for testing in development
when changes are made to a tournament on Challonge without going through Emcee.

---

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)
