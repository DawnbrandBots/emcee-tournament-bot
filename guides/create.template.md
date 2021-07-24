**Add channels**
You need a public channel and a private channel to start signups.
Public channels are used for sign-ups and round announcements.
```
mc!addchannel {}|public```
Private channels are used for player decks and operational messages.
```
mc!addchannel {}|private```
You remove channels if you make a mistake.
```
mc!removechannel {}|public```
The above commands affect the _current_ channel.
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
You can check and change the priority for the systems Challonge uses to break ties.
```
mc!tb {}
mc!tb {}|tb1|tb2|tb3```
You can set a smaller capacity than Challonge Standard: https://challonge.com/pricing
```
mc!capacity {}|limit```
**Open sign-ups**
This posts the registration message to all public channels.
Further details on your next steps will be sent to private channels.
```
mc!open {}```
