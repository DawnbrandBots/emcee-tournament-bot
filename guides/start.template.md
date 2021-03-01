**Drop players**
As before, you can also manually drop players. All **View deck** commands continue to work.
```
mc!forcedrop {}|@User```
**Report score**
Players report their own score.
If you need, you can also report scores. Mention the winner.
```
mc!forcescore {}|2-1|@Winner```
**Advance round**
Restarts the timer in public channels and notifies everybody on Discord about the current round and their pairings.
This doesn't control Challonge, which advances rounds automatically when all scores are submitted.
```
mc!round {}|TIMER|skip```
Both the timer and skip parameters are optional. The round timer defaults to 50 minutes and must be of the form `mm` or `hh:mm`.
The skip parameter must come after the timer parameter if provided and be exactly `skip`. It skips sending pairings in DMs.
**Finish tournament**
After all scores for all rounds are submitted. This will fire off top cut.
```
mc!finish {}```
If you need to stop early, you can cancel.
```
mc!cancel {}```
