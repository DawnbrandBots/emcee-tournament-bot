import { Message } from "eris";
import fetch from "node-fetch";
import { TypedDeck, parseURL, toURL } from "ydke";
import { data } from "./data";
import { enums } from "ygopro-data";

interface DeckProfile {
	monster: { [name: string]: number };
	spell: { [name: string]: number };
	trap: { [name: string]: number };
	miscMain: { [name: string]: number };
	extra: { [name: string]: number };
	side: { [name: string]: number };
}

export class Deck {
	readonly url: string;
	readonly ydk: string;
	private record: TypedDeck;
	constructor(record: TypedDeck, url: string, ydk: string) {
		this.record = record;
		this.url = url;
		this.ydk = ydk;
	}

	private static async messageToYdk(msg: Message): Promise<string> {
		const attach = msg.attachments[0];
		const file = await fetch(attach.url);
		const deck = await file.text();
		return deck;
	}

	private static async constructFromFile(msg: Message): Promise<Deck> {
		const ydk = await Deck.messageToYdk(msg);
		const record = Deck.ydkToRecord(ydk);
		const url = Deck.recordToUrl(record);
		return new Deck(record, url, ydk);
	}

	private static constructFromUrl(url: string): Deck {
		const record = Deck.urlToRecord(url);
		const ydk = Deck.recordToYdk(record);
		return new Deck(record, url, ydk);
	}

	static async construct(msg: Message): Promise<Deck> {
		if (msg.attachments.length > 0 && msg.attachments[0].filename.endsWith(".ydk")) {
			return await this.constructFromFile(msg);
		}
		const ydkeReg = /ydke:\/\/[A-Za-z0-9+/=]*?![A-Za-z0-9+/=]*?![A-Za-z0-9+/=]*?!/g;
		const match = ydkeReg.exec(msg.content);
		if (match == null) {
			throw new Error("Must provide either attached `.ydk` file or valid `ydke://` URL!");
		}
		const ydke = match[0];
		return this.constructFromUrl(ydke);
	}

	private static urlToRecord(url: string): TypedDeck {
		return parseURL(url);
	}

	private static ydkToRecord(ydk: string): TypedDeck {
		const main = [];
		const extra = [];
		const side = [];
		let currentSection = "";
		for (const line of ydk.split(/\r|\n|\r\n/)) {
			if (line.startsWith("#") || line.startsWith("!")) {
				currentSection = line.slice(1);
				continue;
			}
			if (line.trim().length > 0) {
				const code = parseInt(line, 10);
				if (currentSection === "side") {
					side.push(code);
				} else if (currentSection === "extra") {
					extra.push(code);
				} else if (currentSection === "main") {
					main.push(code);
				}
			}
		}
		const typedMain = Uint32Array.from(main);
		const typedExtra = Uint32Array.from(extra);
		const typedSide = Uint32Array.from(side);
		return {
			main: typedMain,
			extra: typedExtra,
			side: typedSide
		};
	}

	private static recordToUrl(record: TypedDeck): string {
		return toURL(record);
	}

	private static recordToYdk(record: TypedDeck): string {
		let ydk = "#created by Akira bot\n#main\n";
		for (const code in record.main) {
			ydk += code + "\n";
		}
		ydk += "#extra\n";
		for (const code in record.extra) {
			ydk += code + "\n";
		}
		ydk += "!side\n";
		for (const code in record.side) {
			ydk += code + "\n";
		}
		return ydk;
	}

	public async getProfile(): Promise<DeckProfile> {
		const profile: DeckProfile = {
			monster: {},
			spell: {},
			trap: {},
			miscMain: {},
			extra: {},
			side: {}
		};
		for (const code of this.record.main) {
			const card = await data.getCard(code, "en");
			let name: string;
			let target: "monster" | "spell" | "trap" | "miscMain" | "extra" | "side";
			if (!card) {
				name = code.toString();
				target = "miscMain";
			} else {
				if ("en" in card.text) {
					name = card.text.en.name;
				} else {
					name = code.toString();
				}
				if (card.data.isType(enums.type.TYPE_MONSTER)) {
					target = "monster";
				} else if (card.data.isType(enums.type.TYPE_SPELL)) {
					target = "spell";
				} else if (card.data.isType(enums.type.TYPE_TRAP)) {
					target = "trap";
				} else {
					target = "miscMain";
				}
			}
			if (name in profile[target]) {
				profile[target][name]++;
			} else {
				profile[target][name] = 1;
			}
		}

		for (const code of this.record.extra) {
			const card = await data.getCard(code, "en");
			let name: string;
			if (!card) {
				name = code.toString();
			} else {
				if ("en" in card.text) {
					name = card.text.en.name;
				} else {
					name = code.toString();
				}
			}
			if (name in profile.extra) {
				profile.extra[name]++;
			} else {
				profile.extra[name] = 1;
			}
		}

		for (const code of this.record.side) {
			const card = await data.getCard(code, "en");
			let name: string;
			if (!card) {
				name = code.toString();
			} else {
				if ("en" in card.text) {
					name = card.text.en.name;
				} else {
					name = code.toString();
				}
			}
			if (name in profile.side) {
				profile.side[name]++;
			} else {
				profile.side[name] = 1;
			}
		}

		return profile;
	}
}
