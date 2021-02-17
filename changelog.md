# Changelog  

This file is a work in progress, currently documenting changes since the 2021-01-23 release that will be included in the next tag. These changes concern user-facing features and not internal structure.
## Date Pending
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
