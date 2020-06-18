import { Message, PrivateChannel, MessageContent, MessageFile } from "eris";
import { bot } from "./bot";
import { Deck } from "./deck";

function errMsgHandler(err: Error, msg: Message): void {
	msg.channel.createMessage(err.message).catch(console.error);
}

function messageCapSlice(outString: string, cap = 2000): string[] {
	const outStrings: string[] = [];
	while (outString.length > cap) {
		let index = outString.slice(0, cap).lastIndexOf("\n");
		if (index === -1 || index >= cap) {
			index = outString.slice(0, cap).lastIndexOf(".");
			if (index === -1 || index >= cap) {
				index = outString.slice(0, cap).lastIndexOf(" ");
				if (index === -1 || index >= cap) {
					index = cap - 1;
				}
			}
		}
		outStrings.push(outString.slice(0, index + 1));
		outString = outString.slice(index + 1);
	}
	outStrings.push(outString);
	return outStrings;
}

bot.on("messageCreate", (msg: Message) => {
	if (msg.author.bot) {
		return;
	}
	if (msg.channel instanceof PrivateChannel) {
		Deck.construct(msg)
			.then(deck => {
				deck
					.getProfile()
					.then(profile => {
						const title = "Contents of your deck:\n";
						const mainCount =
							profile.typeCounts.main.monster + profile.typeCounts.main.spell + profile.typeCounts.main.trap;
						let mainHeader = "Main Deck (" + mainCount + " cards - ";
						const mainHeaderParts: string[] = [];
						if (profile.typeCounts.main.monster > 0) {
							mainHeaderParts.push(profile.typeCounts.main.monster + " Monsters");
						}
						if (profile.typeCounts.main.spell > 0) {
							mainHeaderParts.push(profile.typeCounts.main.spell + " Spells");
						}
						if (profile.typeCounts.main.trap > 0) {
							mainHeaderParts.push(profile.typeCounts.main.trap + " Traps");
						}
						mainHeader += mainHeaderParts.join(", ") + ")";
						let mainBody = "";
						for (const name in profile.nameCounts.main) {
							mainBody += profile.nameCounts.main[name] + " " + name + "\n";
						}

						const extraCount =
							profile.typeCounts.extra.fusion +
							profile.typeCounts.extra.synchro +
							profile.typeCounts.extra.xyz +
							profile.typeCounts.extra.link;
						let extraHeader = "Extra Deck (" + extraCount + " cards - ";
						const extraHeaderParts: string[] = [];
						if (profile.typeCounts.extra.fusion > 0) {
							extraHeaderParts.push(profile.typeCounts.extra.fusion + " Fusion");
						}
						if (profile.typeCounts.extra.synchro > 0) {
							extraHeaderParts.push(profile.typeCounts.extra.synchro + " Synchro");
						}
						if (profile.typeCounts.extra.xyz > 0) {
							extraHeaderParts.push(profile.typeCounts.extra.xyz + " Xyz");
						}
						if (profile.typeCounts.extra.link > 0) {
							extraHeaderParts.push(profile.typeCounts.extra.link + " Link");
						}
						extraHeader += extraHeaderParts.join(", ") + ")";
						let extraBody = "";
						for (const name in profile.nameCounts.extra) {
							extraBody += profile.nameCounts.extra[name] + " " + name + "\n";
						}

						const sideCount =
							profile.typeCounts.side.monster + profile.typeCounts.side.spell + profile.typeCounts.side.trap;
						let sideHeader = "Side Deck (" + sideCount + " cards - ";
						const sideHeaderParts: string[] = [];
						if (profile.typeCounts.side.monster > 0) {
							sideHeaderParts.push(profile.typeCounts.side.monster + " Monsters");
						}
						if (profile.typeCounts.main.spell > 0) {
							sideHeaderParts.push(profile.typeCounts.side.spell + " Spells");
						}
						if (profile.typeCounts.main.trap > 0) {
							sideHeaderParts.push(profile.typeCounts.side.trap + " Traps");
						}
						sideHeader += sideHeaderParts.join(", ") + ")";
						let sideBody = "";
						for (const name in profile.nameCounts.side) {
							sideBody += profile.nameCounts.side[name] + " " + name + "\n";
						}

						const out: MessageContent = {
							embed: { title, fields: [] }
						};
						if (out.embed && out.embed.fields) {
							if (mainCount > 0) {
								const mainOuts = messageCapSlice(mainBody, 1024);
								for (let i = 0; i < mainOuts.length; i++) {
									out.embed.fields.push({ name: mainHeader + (i > 0 ? " (Continued)" : ""), value: mainOuts[i] });
								}
							}
							if (extraCount > 0) {
								const extraOuts = messageCapSlice(extraBody, 1024);
								for (let i = 0; i < extraOuts.length; i++) {
									out.embed.fields.push({ name: extraHeader + (i > 0 ? " (Continued)" : ""), value: extraOuts[i] });
								}
							}
							if (sideCount > 0) {
								const sideOuts = messageCapSlice(sideBody, 1024);
								for (let i = 0; i < sideOuts.length; i++) {
									out.embed.fields.push({ name: sideHeader + (i > 0 ? " (Continued)" : ""), value: sideOuts[i] });
								}
							}
							if (profile.archetypes.length > 0) {
								out.embed.fields.push({ name: "Archetypes", value: profile.archetypes.join(",") });
							}
							out.embed.fields.push({ name: "YDKE URL", value: profile.url });
						}
						const file: MessageFile = {
							file: profile.ydk,
							name: msg.author.username + msg.author.discriminator + ".ydk"
						};
						msg.channel.createMessage(out, file).catch(err => {
							errMsgHandler(err, msg);
						});
					})
					.catch(err => {
						errMsgHandler(err, msg);
					});
			})
			.catch(err => {
				errMsgHandler(err, msg);
			});
	}
});

bot.on("ready", () => {
	console.log("Logged in as %s - %s", bot.user.username, bot.user.id);
});

bot.connect().catch(console.error);
