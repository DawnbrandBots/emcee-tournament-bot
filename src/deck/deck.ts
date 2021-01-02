import { Card, CardArray, Deck } from "ydeck";
import { Card as DataCard, YgoData } from "ygopro-data";
import cardOpts from "../config/cardOpts.json";
import dataOpts from "../config/dataOpts.json";
import { octokitToken } from "../config/env";
import transOpts from "../config/transOpts.json";
import { getLogger } from "../util/logger";

const logger = getLogger("deck");

const data = new YgoData(cardOpts, transOpts, dataOpts, "./dbs", octokitToken);

let cardArray: CardArray | undefined;

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

export async function initializeCardArray(): Promise<void> {
	if (!cardArray) {
		const dataArray = await data.getCardList();
		cardArray = {};
		for (const code in dataArray) {
			cardArray[code] = await convertCard(dataArray[code]);
		}
		logger.info("ygo-data preload for ydeck complete");
	} else {
		logger.warn(new Error("initializeCardArray called multiple times"));
	}
}

const deckCache: { [url: string]: Deck } = {};

export function getDeck(url: string, limiter?: string): Deck {
	if (!cardArray) {
		throw new Error("getDeck called before initializeCardArray");
	}
	if (!deckCache[url]) {
		deckCache[url] = new Deck(url, cardArray, limiter);
	}
	return deckCache[url];
}
