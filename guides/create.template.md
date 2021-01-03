Thanks for hosting your tournament with Emcee! To get started, you'll want to add some announcement channels.
A public announcement channel will be where players in your tournament will see signups and new rounds. To add the current channel as a public channel, use this command.
`mc!addchannel {}`
To add a different channel as a public announcement channel, mention it. So for a channel called #pairings, use this command.
`mc!addchannel {}|public|#pairings`
A private announcement channel will be where hosts can see the decks players submit. To add the current channel as a private channel, use this command.
`mc!addchannel {}|private`
You can also mention private channels. For a channel called #decks, use this command.
`mc!addchannel {}|private|#decks`
If you want to change the name or description of the tournament, you can use this command.
`mc!update {}|New Name|A new description`
To add another user as a host so they can manage the tournament, you'll mention them. Be careful, only give this privilege to people you'd trust as moderators. For the user Sample, you'd use this command.
`mc!addhost {}|@Sample`
If you need to take those privileges away, you can use this command.
`mc!removehost {}|@Sample`
When you're ready to open signups for your tournament, you can use this command, and after that we'll send details to private channels on how to proceed.
`mc!open {}`
