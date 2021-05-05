import { AdvancedMessageContent, Attachment, Message, MessageFile } from "eris";
import fetch from "node-fetch";
import { Card, CardArray, Deck } from "ydeck";
import { DeckError } from "ydeck/dist/validation";
import { Card as DataCard, YgoData } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
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

async function convertCard(card: DataCard): Promise<Card> {
	const status = await card.status;
	const scopeReg = /([a-zA-Z]+): (\d)/g;
	const statusMap: { [scope: number]: number } = {};
	let result = scopeReg.exec(status);
	while (result !== null) {
		const scope = result[1];
		const count = parseInt(result[2], 10); // 2 capture groups ensured by regex
		// 3 copies is the default fallback
		if (count < 3) {
			// TODO: Less hardcode
			if (scope === "OCG") {
				statusMap[0x1] = count;
			} else if (scope === "TCG") {
				statusMap[0x2] = count;
			}
		}
		result = scopeReg.exec(status);
	}
	return new Card(card.text.en.name, card.data.ot, card.data.type, card.data.setcode, statusMap);
}

export async function initializeDeckManager(octokitToken: string): Promise<DeckManager> {
	logger.info("ygo-data preload for ydeck starting");
	const data = new YgoData(cardOpts, transOpts, dataOpts, "./dbs", octokitToken);
	const dataArray = await data.getCardList();
	const cardArray: CardArray = {};
	for (const code in dataArray) {
		cardArray[code] = await convertCard(dataArray[code]);
	}
	logger.info("ygo-data preload for ydeck complete");
	return new DeckManager(cardArray);
}

export class DeckManager {
	// TODO: what is the lifetime of this cache?
	private deckCache = new Map<string, Deck>(); // key: ydke URL
	constructor(private cardArray: CardArray) {}

	public getDeck(url: string, limiter = "TCGANGU"): Deck {
		if (!this.deckCache.has(url)) {
			this.deckCache.set(url, new Deck(url, this.cardArray, limiter));
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.deckCache.get(url)!;
	}

	public async getDeckFromMessage(msg: Message): Promise<Deck> {
		if (msg.attachments.length > 0 && msg.attachments[0].filename.endsWith(".ydk")) {
			const ydk = await this.extractYdk(msg.attachments[0]); // throws on network error
			const url = Deck.ydkToUrl(ydk); // throws YdkConstructionError
			return this.getDeck(url); // no throw since the url is the output of ydke.js
		}
		return this.getDeck(msg.content); // throws: UrlConstructionError
	}

	public prettyPrint(deck: Deck, filename: string): [AdvancedMessageContent, MessageFile] {
		const title = "Contents of your deck:\n";
		let mainHeader = `Main Deck (${deck.mainSize} cards - `;
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

		let extraHeader = `Extra Deck (${deck.extraSize} cards - `;
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

		let sideHeader = `Side Deck (${deck.sideSize} cards - `;
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

		if (deck.mainSize > 0) {
			const mainOuts = splitText(deck.mainText, 1024);
			for (let i = 0; i < mainOuts.length; i++) {
				fields.push({ name: mainHeader + (i > 0 ? " (Continued)" : ""), value: mainOuts[i] });
			}
		}
		if (deck.extraSize > 0) {
			const extraOuts = splitText(deck.extraText, 1024);
			for (let i = 0; i < extraOuts.length; i++) {
				fields.push({ name: extraHeader + (i > 0 ? " (Continued)" : ""), value: extraOuts[i] });
			}
		}
		if (deck.sideSize > 0) {
			const sideOuts = splitText(deck.sideText, 1024);
			for (let i = 0; i < sideOuts.length; i++) {
				fields.push({ name: sideHeader + (i > 0 ? " (Continued)" : ""), value: sideOuts[i] });
			}
		}
		if (deck.themes.length > 0) {
			fields.push({ name: "Archetypes", value: deck.themes.join(",") });
		}
		fields.push({ name: "YDKE URL", value: deck.url });
		if (deck.validationErrors.length > 0) {
			fields.push({
				name: "Deck is illegal!",
				value: deck.validationErrors.map(d => this.parseDeckError(d)).join("\n")
			});
		}

		return [{ embed: { title, fields } }, { file: deck.ydk, name: filename }];
	}

	private async extractYdk(attach: Attachment): Promise<string> {
		const file = await fetch(attach.url);
		const ydk = await file.text();
		return ydk;
	}

	private capFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private parseDeckError(err: DeckError): string {
		if (err.type === "size") {
			return `${this.capFirst(err.target)} Deck too ${err.min ? "small" : "large"}! Should be at ${
				err.min ? `least ${err.min}` : `most ${err.max}`
			}, is ${err.actual}!`;
		}
		// else type is limit
		return `Too many copies of card ${err.name} (${err.target})! Should be at most ${err.max}, is ${err.actual}!`;
	}
}
