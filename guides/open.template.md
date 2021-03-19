Players can sign up now.
**Drop players**
Players can drop themselves.
If you need, you can also drop players.
```
mc!forcedrop {}|@User
mc!forcedrop {}|id```
**Add bye**
Players with a bye don't play in round 1.
This gives them a free win.
```
mc!addbye {}|@User
mc!removebye {}|@User```
**View decks**
You can view a single player's deck.
```
mc!deck {}|@User```
You can download a CSV file of all players with their deck's archetype.
```
mc!players {}```
You can download a CSV file of all players with their deck lists.
```
mc!dump {}```
You can download a CSV file of how many decks have each archetype.
```
mc!pie {}```
**Start tournament**
This will start the first round of play.
Further details will be sent to private channels.
```
mc!start {}|TIMER|skip```
Both the timer and skip parameters are optional.
The round timer defaults to 50 minutes and must be of the form `mm` or `hh:mm`.
This only applies to round 1 and an explicit zero timer results in no timer.
The skip parameter must come after the timer parameter if provided and be exactly `skip`.
It skips sending pairings in DMs.
