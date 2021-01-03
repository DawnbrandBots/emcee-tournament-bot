**Add channels**
You need a public channel to start signups.
Public channels are used for signups and pairings.
```
mc!addchannel {}|public|#pairings```
Private channels are used for player decks.
```
mc!addchannel {}|private|#decks```
You remove channels if you make a mistake.
```
mc!removechannel {}|public|#pairings```
If you don't mention a channel, it will add the current channel.
**Add hosts**
Hosts have all the same permissions you do.
Trust them like you would a moderator.
```
mc!addhost {}|@User
mc!removehost {}|@User```
**Change info**
You can change the name and description.
```
mc!update {}|New Name|A new description```
**Open signups**
This will start the next stage of the tournament.
Further details will be sent to private channels.
```
mc!open {}```
