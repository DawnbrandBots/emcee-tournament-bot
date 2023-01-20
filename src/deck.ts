import { Attachment, escapeMarkdown, Message, MessageEmbed, ReplyMessageOptions } from "discord.js";
import fetch from "node-fetch";
import { CardIndex, CardVector, createAllowVector, Deck, DeckError, ICard } from "ydeck";
import { Card, enums, YgoData } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
import { UserError } from "./util/errors";
import { getLogger } from "./util/logger";

const logger = getLogger("deck");

export function splitText(outString: string, cap = 2000): string[] {
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

async function convertCard(card: Card): Promise<ICard> {
	const status = await card.status;
	const scopeRegex = /([a-zA-Z]+): (\d)/g;
	let limitTCG = NaN,
		limitOCG = NaN;
	let result = scopeRegex.exec(status);
	while (result !== null) {
		const scope = result[1];
		const count = parseInt(result[2], 10);
		if (scope === "OCG") {
			limitOCG = count;
		} else if (scope === "TCG") {
			limitTCG = count;
		}
		result = scopeRegex.exec(status);
	}
	return {
		name: card.text.en.name,
		type: card.data.type,
		setcode: card.data.setcode,
		alias: card.data.alias || undefined,
		limitTCG,
		limitOCG,
		isPrerelease: !!(card.data.ot & 0x100)
	};
}

export async function initializeDeckManager(octokitToken: string): Promise<DeckManager> {
	logger.info("ygo-data preload for ydeck starting");
	const data = new YgoData(cardOpts, transOpts, dataOpts, "./dbs", octokitToken);
	const cardList = await data.getCardList();
	const cardIndex: ConstructorParameters<typeof DeckManager>[0] = new Map();
	for (const password in cardList) {
		if (
			cardList[password].data.ot & (enums.ot.OT_OCG | enums.ot.OT_TCG | enums.ot.OT_ILLEGAL) &&
			!(cardList[password].data.type & enums.type.TYPE_TOKEN)
		) {
			cardIndex.set(Number(password), await convertCard(cardList[password]));
		}
	}
	logger.notify("ygo-data preload for ydeck complete");
	return new DeckManager(cardIndex);
}

const MAX_BYTES = 1024;

export class DeckManager {
	// TODO: what is the lifetime of this cache?
	private readonly deckCache = new Map<string, Deck>(); // key: ydke URL
	public readonly tcgAllowVector: CardVector;
	constructor(private readonly cardIndex: CardIndex) {
		this.tcgAllowVector = createAllowVector(cardIndex, card => {
			if (isNaN(card.limitTCG) || card.isPrerelease) {
				return 0;
			} else if (card.alias) {
				return -1;
			} else {
				return card.limitTCG;
			}
		});
	}

	public getDeck(url: string): Deck {
		if (!this.deckCache.has(url)) {
			this.deckCache.set(url, new Deck(this.cardIndex, { url }));
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.deckCache.get(url)!;
	}

	public async getDeckFromMessage(
		msg: Message,
		allowVector: CardVector = this.tcgAllowVector
	): Promise<[Deck, DeckError[]]> {
		// TODO: inconsistencies with banlist upload handling
		const attachment = msg.attachments.first();
		if (attachment && attachment.name?.endsWith(".ydk")) {
			// cap filesize for security
			if (attachment.size > MAX_BYTES) {
				// TODO: Would be useful to report tournament and server, but we don't have that data in this scope
				const who = `${escapeMarkdown(msg.author.tag)} (${msg.author.id})`;
				logger.notify(`Potential abuse warning! ${who} submitted oversized deck file of ${attachment.size}B.`);
				throw new UserError("YDK file too large! Please try again with a smaller file.");
			}
			const ydk = await this.extractYdk(attachment); // throws on network error
			const deck = new Deck(this.cardIndex, { ydk }); // throws YDKParseError
			this.deckCache.set(deck.url, deck);
			return [deck, deck.validate(allowVector)];
		}
		const deck = this.getDeck(msg.content);
		return [deck, deck.validate(allowVector)]; // throws: UrlConstructionError
	}

	// return type from discord.js message sending
	public prettyPrint(deck: Deck, name: string, errors: DeckError[] = []): ReplyMessageOptions {
		const title = `Themes: ${deck.themes.join(",") || "none"}`;
		let mainHeader = `Main Deck (${deck.contents.main.length} cards — `;
		const mainHeaderParts: string[] = [];
		if (deck.mainTypeCounts.monster > 0) {
			mainHeaderParts.push(`${deck.mainTypeCounts.monster} Monsters`);
		}
		if (deck.mainTypeCounts.spell > 0) {
			mainHeaderParts.push(`${deck.mainTypeCounts.spell} Spells`);
		}
		if (deck.mainTypeCounts.trap > 0) {
			mainHeaderParts.push(`${deck.mainTypeCounts.trap} Traps`);
		}
		mainHeader += `${mainHeaderParts.join(", ")})`;

		let extraHeader = `Extra Deck (${deck.contents.extra.length} cards — `;
		const extraHeaderParts: string[] = [];
		if (deck.extraTypeCounts.fusion > 0) {
			extraHeaderParts.push(`${deck.extraTypeCounts.fusion} Fusion`);
		}
		if (deck.extraTypeCounts.synchro > 0) {
			extraHeaderParts.push(`${deck.extraTypeCounts.synchro} Synchro`);
		}
		if (deck.extraTypeCounts.xyz > 0) {
			extraHeaderParts.push(`${deck.extraTypeCounts.xyz} Xyz`);
		}
		if (deck.extraTypeCounts.link > 0) {
			extraHeaderParts.push(`${deck.extraTypeCounts.link} Link`);
		}
		extraHeader += `${extraHeaderParts.join(", ")})`;

		let sideHeader = `Side Deck (${deck.contents.side.length} cards — `;
		const sideHeaderParts: string[] = [];
		if (deck.sideTypeCounts.monster > 0) {
			sideHeaderParts.push(`${deck.sideTypeCounts.monster} Monsters`);
		}
		if (deck.sideTypeCounts.spell > 0) {
			sideHeaderParts.push(`${deck.sideTypeCounts.spell} Spells`);
		}
		if (deck.sideTypeCounts.trap > 0) {
			sideHeaderParts.push(`${deck.sideTypeCounts.trap} Traps`);
		}
		sideHeader += `${sideHeaderParts.join(", ")})`;

		const fields = [];
		// text splitting probably never happens now due to file size checks
		if (deck.contents.main.length) {
			const mainOuts = splitText(deck.mainText, 1024);
			for (let i = 0; i < mainOuts.length; i++) {
				fields.push({ name: mainHeader + (i > 0 ? " [continued]" : ""), value: mainOuts[i] });
			}
		}
		if (deck.contents.extra.length) {
			const extraOuts = splitText(deck.extraText, 1024);
			for (let i = 0; i < extraOuts.length; i++) {
				fields.push({ name: extraHeader + (i > 0 ? " [continued]" : ""), value: extraOuts[i] });
			}
		}
		if (deck.contents.side.length) {
			const sideOuts = splitText(deck.sideText, 1024);
			for (let i = 0; i < sideOuts.length; i++) {
				fields.push({ name: sideHeader + (i > 0 ? " [continued]" : ""), value: sideOuts[i] });
			}
		}
		fields.push({ name: "YDKE URL", value: deck.url });
		if (errors.length) {
			const heading = `Deck is illegal! (${errors.length})`;
			const payload = errors.map(d => this.formatDeckError(d)).join("\n");
			const parts = splitText(payload, 1024);
			for (let i = 0; i < parts.length; i++) {
				fields.push({
					name: heading + (i > 0 ? " [continued]" : ""),
					value: parts[i]
				});
			}
		}

		return {
			embeds: [new MessageEmbed().setTitle(title).addFields(fields)],
			files: [{ name, attachment: Buffer.from(deck.ydk) }]
		};
	}

	private async extractYdk(attach: Attachment): Promise<string> {
		const file = await fetch(attach.url);
		const ydk = await file.text();
		return ydk;
	}

	private capFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private formatDeckError(err: DeckError): string {
		if (err.type === "size") {
			return `${this.capFirst(err.target)} Deck too ${err.min ? "small" : "large"}! Should be at ${
				err.min ? `least ${err.min}` : `most ${err.max}`
			}, is ${err.actual}!`;
		}
		// else type is limit
		return `Too many copies of card ${err.name} (${err.target})! Should be at most ${err.max}, is ${err.actual}!`;
	}
}
