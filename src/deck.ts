import { YgoData, Card as DataCard } from "ygopro-data";
import cardOpts from "./config/cardOpts.json";
import dataOpts from "./config/dataOpts.json";
import transOpts from "./config/transOpts.json";
import { octokitToken } from "./config/env";

import { Deck, Card, CardArray } from "ydeck";

const data = new YgoData(cardOpts, transOpts, dataOpts, "./dbs", octokitToken);

let cardArray: CardArray | undefined;

async function convertCard(card: DataCard): Promise<Card> {
	const status = await card.status;
	const scopeReg = /([a-zA-Z]+): (\d)/g;
	const statusMap: { [scope: number]: number } = {};
	let result = scopeReg.exec(status);
	while (result !== null) {
		const scope = result[1];
		const count = parseInt(result[2], 10);
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

async function getCardArray(): Promise<CardArray> {
	if (!cardArray) {
		const dataArray = await data.getCardList();
		const promArray: { [code: number]: Promise<Card> } = {};
		for (const code in dataArray) {
			promArray[code] = convertCard(dataArray[code]);
		}
		await Promise.all(Object.values(promArray));
		const tempArray: CardArray = {};
		for (const code in promArray) {
			tempArray[code] = await promArray[code];
		}
		cardArray = tempArray;
	}
	return cardArray;
}

const deckCache: { [url: string]: Deck } = {};

export async function getDeck(url: string, limiter?: string): Promise<Deck> {
	if (!deckCache[url]) {
		const array = await getCardArray();
		deckCache[url] = new Deck(url, array, limiter);
	}
	return deckCache[url];
}
