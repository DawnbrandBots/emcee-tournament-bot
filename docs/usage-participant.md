# Commands for participants

[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)

## Help
Usage: `mc!help`

Permissions: Global

Provides a link to this documentation wiki.

## Tournament registration
When a tournament is started by a tournament host, a message will be posted by Emcee to a designated channel in the server, with a "✅" reaction on it. Clicking this reaction will sign you up for the tournament, and you'll get a Direct Message from Emcee instructing you to submit a deck. You can submit either a YDK deck file by uploading it to Discord, or a YDKE URL by replying with it in a message. Emcee will then respond by showing you your deck profile. If the deck is illegal, this profile will tell you what the issues are so you can fix them, you will not be signed up for the tournament and Emcee will instruct you to resubmit. If the deck is legal, you will be signed up for the tournament, you will receive a tournament participant role, and your deck will be forwarded to the tournament hosts. If you want to change your deck, you can send Emcee a new deck file and it will send your new deck to the tournament hosts. If you change your mind about playing, you can uncheck the "✅" reaction to drop from the tournament. If the tournament starts, and you have checked the "✅" reaction but not yet submitted a deck, Emcee will inform you that you have been dropped.

## Playing in a tournament
When each round of the tournament begins, a message will be posted to the same channel you signed up from with a link to the bracket on Challonge. From there, it's up to you to contact your opponent and play your match within the round's time limit. Emcee will post a 50-minute timer that counts down every 5 seconds, and will tag all players instructing them to finish the round. To report your score, both you and your opponent need to use the `mc!score` command. The round message will have the tournament ID, and you need to submit with the command `mc!score id|your score-opp's score`. For example, if you won the match 2-1 in the tournament "example", you need to use `mc!score mc_example|2-1` and your opponent needs to use `mc!score mc_example|1-2`.


[Back to main](https://github.com/AlphaKretin/emcee-tournament-bot#project-ignis-emcee)
