All **View deck** commands continue to work.
**Drop players**
As before, you can still manually drop players.
```
mc!forcedrop {}|@User
mc!forcedrop {}|id```
**Report score**
Players report their own score.
If you need, you can also report scores. Mention the winner.
```
mc!forcescore {}|2-1|@Winner```
If you have a lot of unfinished matches at the end of the round, you can make them all ties at once.
```
mc!tie {}```
**Advance round**
Restarts the timer in public channels and notifies everybody on Discord about the current round and their pairings.
This doesn't control Challonge, which advances rounds automatically when all scores are submitted.
```
mc!round {}|TIMER|skip```
Both the timer and skip parameters are optional.
The round timer defaults to 50 minutes and must be of the form `mm` or `hh:mm`.
An explicit zero timer results in no timer.
The skip parameter must come after the timer parameter if provided and be exactly `skip`.
It skips sending pairings in DMs.
**Finish tournament**
After all scores for all rounds are submitted.
```
mc!finish {}```
If you need to stop early, you can cancel.
```
mc!cancel {}```
**Top cut**
```
mc!topcut {}|size```
Fires off a top cut with the given size for a completed tournament.
