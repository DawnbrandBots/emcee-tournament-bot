import { Deck } from "./deck";
import { Message, MessageContent, MessageFile, TextChannel } from "eris";
import fetch from "node-fetch";
import { extractURLs } from "ydke";
import { bot } from "./bot";
import { DeckNotFoundError, AssertTextChannelError } from "./errors";

export class DiscordDeck extends Deck {
	private static async messageToYdk(msg: Message): Promise<string> {
		const attach = msg.attachments[0];
		const file = await fetch(attach.url);
		const deck = await file.text();
		return deck;
	}

	public static async constructFromMessage(msg: Message): Promise<DiscordDeck> {
		if (msg.attachments.length > 0 && msg.attachments[0].filename.endsWith(".ydk")) {
			const ydk = await this.messageToYdk(msg);
			return await this.constructFromYdk(ydk);
		}
		const matches = extractURLs(msg.content);
		if (matches.length === 0) {
			throw new DeckNotFoundError();
		}
		const ydke = matches[0];
		return this.constructFromUrl(ydke);
	}

	private static messageCapSlice(outString: string, cap = 2000): string[] {
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

	public async sendProfile(channelId: string, filename: string): Promise<Message> {
		const channel = bot.getChannel(channelId);
		if (!(channel instanceof TextChannel)) {
			throw new AssertTextChannelError(channelId);
		}
		const profile = await this.getProfile();
		const title = "Contents of your deck:\n";
		const mainCount =
			profile.typeCounts.main.monster + profile.typeCounts.main.spell + profile.typeCounts.main.trap;
		let mainHeader = `Main Deck (${mainCount} cards - `;
		const mainHeaderParts: string[] = [];
		if (profile.typeCounts.main.monster > 0) {
			mainHeaderParts.push(`${profile.typeCounts.main.monster} Monsters`);
		}
		if (profile.typeCounts.main.spell > 0) {
			mainHeaderParts.push(`${profile.typeCounts.main.spell} Spells`);
		}
		if (profile.typeCounts.main.trap > 0) {
			mainHeaderParts.push(`${profile.typeCounts.main.trap} Traps`);
		}
		mainHeader += `${mainHeaderParts.join(", ")})`;
		let mainBody = "";
		for (const name in profile.nameCounts.main) {
			mainBody += `${profile.nameCounts.main[name]} ${name}\n`;
		}

		const extraCount =
			profile.typeCounts.extra.fusion +
			profile.typeCounts.extra.synchro +
			profile.typeCounts.extra.xyz +
			profile.typeCounts.extra.link;
		let extraHeader = `Extra Deck (${extraCount} cards - `;
		const extraHeaderParts: string[] = [];
		if (profile.typeCounts.extra.fusion > 0) {
			extraHeaderParts.push(`${profile.typeCounts.extra.fusion} Fusion`);
		}
		if (profile.typeCounts.extra.synchro > 0) {
			extraHeaderParts.push(`${profile.typeCounts.extra.synchro} Synchro`);
		}
		if (profile.typeCounts.extra.xyz > 0) {
			extraHeaderParts.push(`${profile.typeCounts.extra.xyz} Xyz`);
		}
		if (profile.typeCounts.extra.link > 0) {
			extraHeaderParts.push(`${profile.typeCounts.extra.link} Link`);
		}
		extraHeader += `${extraHeaderParts.join(", ")})`;
		let extraBody = "";
		for (const name in profile.nameCounts.extra) {
			extraBody += `${profile.nameCounts.extra[name]} ${name}\n`;
		}

		const sideCount =
			profile.typeCounts.side.monster + profile.typeCounts.side.spell + profile.typeCounts.side.trap;
		let sideHeader = `Side Deck (${sideCount} cards - `;
		const sideHeaderParts: string[] = [];
		if (profile.typeCounts.side.monster > 0) {
			sideHeaderParts.push(`${profile.typeCounts.side.monster} Monsters`);
		}
		if (profile.typeCounts.main.spell > 0) {
			sideHeaderParts.push(`${profile.typeCounts.side.spell} Spells`);
		}
		if (profile.typeCounts.main.trap > 0) {
			sideHeaderParts.push(`${profile.typeCounts.side.trap} Traps`);
		}
		sideHeader += `${sideHeaderParts.join(", ")})`;
		let sideBody = "";
		for (const name in profile.nameCounts.side) {
			sideBody += `${profile.nameCounts.side[name]} ${name}\n`;
		}
		const errors = await this.validate();

		const out: MessageContent = {
			embed: { title, fields: [] }
		};
		if (out.embed && out.embed.fields) {
			if (mainCount > 0) {
				const mainOuts = DiscordDeck.messageCapSlice(mainBody, 1024);
				for (let i = 0; i < mainOuts.length; i++) {
					out.embed.fields.push({ name: mainHeader + (i > 0 ? " (Continued)" : ""), value: mainOuts[i] });
				}
			}
			if (extraCount > 0) {
				const extraOuts = DiscordDeck.messageCapSlice(extraBody, 1024);
				for (let i = 0; i < extraOuts.length; i++) {
					out.embed.fields.push({ name: extraHeader + (i > 0 ? " (Continued)" : ""), value: extraOuts[i] });
				}
			}
			if (sideCount > 0) {
				const sideOuts = DiscordDeck.messageCapSlice(sideBody, 1024);
				for (let i = 0; i < sideOuts.length; i++) {
					out.embed.fields.push({ name: sideHeader + (i > 0 ? " (Continued)" : ""), value: sideOuts[i] });
				}
			}
			if (profile.archetypes.length > 0) {
				out.embed.fields.push({ name: "Archetypes", value: profile.archetypes.join(",") });
			}
			out.embed.fields.push({ name: "YDKE URL", value: profile.url });
			if (errors.length > 0) {
				out.embed.fields.push({ name: "Deck is illegal!", value: errors.join("\n") });
			}
		}
		const file: MessageFile = {
			file: profile.ydk,
			name: filename
		};
		return await channel.createMessage(out, file);
	}

	public static async sendProfile(msg: Message, channel?: string, filename?: string): Promise<Message> {
		const deck = await DiscordDeck.constructFromMessage(msg);
		if (!channel) {
			channel = msg.channel.id;
		}
		if (!filename) {
			filename = `${msg.author.username}#${msg.author.discriminator}.ydk`;
		}
		return await deck.sendProfile(channel, filename);
	}
}
