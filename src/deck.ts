import fetch from "node-fetch";
import { Card, CardArray, Deck, UrlConstructionError } from "ydeck";
import { DeckError } from "ydeck/dist/validation";
import { Card as DataCard, YgoData } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
import { DiscordAttachmentOut, DiscordMessageIn, DiscordMessageOut } from "./discord/interface";
import { getLogger } from "./util/logger";

const logger = getLogger("deck");

function splitText(outString: string, cap = 2000): string[] {
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
	private deckCache: { [url: string]: Deck } = {};
	constructor(private cardArray: CardArray) {}

	public getDeck(url: string, limiter?: string): Deck {
		if (!this.deckCache[url]) {
			this.deckCache[url] = new Deck(url, this.cardArray, limiter);
		}
		return this.deckCache[url];
	}

	public async getDeckFromMessage(msg: DiscordMessageIn): Promise<Deck | null> {
		if (msg.attachments.length > 0 && msg.attachments[0].filename.endsWith(".ydk")) {
			const ydk = await this.extractYdk(msg);
			const url = Deck.ydkToUrl(ydk);
			return this.getDeck(url);
		}
		try {
			return this.getDeck(msg.content); // This function will parse out a ydke URL if present
		} catch (e) {
			if (e instanceof UrlConstructionError) {
				return null;
			} else {
				throw e;
			}
		}
	}

	public prettyPrint(deck: Deck, filename: string): [DiscordMessageOut, DiscordAttachmentOut] {
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

		const embed: DiscordMessageOut = { title, fields: [] };

		if (deck.mainSize > 0) {
			const mainOuts = splitText(deck.mainText, 1024);
			for (let i = 0; i < mainOuts.length; i++) {
				embed.fields.push({ name: mainHeader + (i > 0 ? " (Continued)" : ""), value: mainOuts[i] });
			}
		}
		if (deck.extraSize > 0) {
			const extraOuts = splitText(deck.extraText, 1024);
			for (let i = 0; i < extraOuts.length; i++) {
				embed.fields.push({ name: extraHeader + (i > 0 ? " (Continued)" : ""), value: extraOuts[i] });
			}
		}
		if (deck.sideSize > 0) {
			const sideOuts = splitText(deck.sideText, 1024);
			for (let i = 0; i < sideOuts.length; i++) {
				embed.fields.push({ name: sideHeader + (i > 0 ? " (Continued)" : ""), value: sideOuts[i] });
			}
		}
		if (deck.themes.length > 0) {
			embed.fields.push({ name: "Archetypes", value: deck.themes.join(",") });
		}
		embed.fields.push({ name: "YDKE URL", value: deck.url });
		if (deck.validationErrors.length > 0) {
			embed.fields.push({
				name: "Deck is illegal!",
				value: deck.validationErrors.map(d => this.parseDeckError(d)).join("\n")
			});
		}

		const file: DiscordAttachmentOut = {
			contents: deck.ydk,
			filename: filename
		};
		return [embed, file];
	}

	private async extractYdk(msg: DiscordMessageIn): Promise<string> {
		const attach = msg.attachments[0]; // msg having attachments is checked before this function is called
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
