import { Message } from "eris";
import fetch from "node-fetch";
import { enums } from "ygopro-data";
import { data } from "./data";

interface DeckSection {
	[code: number]: number;
}

interface DeckRecord {
	monster: DeckSection;
	spell: DeckSection;
	trap: DeckSection;
	extra: DeckSection;
	side: DeckSection;
}

export class Deck {
	readonly url: string;
	readonly ydk: string;
	private record: DeckRecord;
	constructor(record: DeckRecord, url?: string, ydk?: string) {
		this.record = record;
		if (url) {
			this.url = url;
		} else {
			this.url = this.recordToUrl();
		}
		if (ydk) {
			this.ydk = ydk;
		} else {
			this.ydk = this.recordToYdk();
		}
	}

	private static async messageToYdk(msg: Message): Promise<string> {
		const attach = msg.attachments[0];
		const file = await fetch(attach.url);
		const deck = await file.text();
		return deck;
	}

	static async constructFromFile(msg: Message): Promise<Deck> {
		const ydk = await Deck.messageToYdk(msg);
		const record = await Deck.ydkToRecord(ydk);
		return new Deck(record, undefined, ydk);
	}

	static async constructFromUrl(url: string): Promise<Deck> {
		const record = await Deck.urlToRecord(url);
		return new Deck(record, url, undefined);
	}

	private static byte(c: string): number {
		return c.charCodeAt(0);
	}

	private static atob(str: string): string {
		return Buffer.from(str, "base64").toString("binary");
	}

	private static toPasscodes(base64: string): Uint32Array {
		return new Uint32Array(Uint8Array.from(Deck.atob(base64), Deck.byte).buffer);
	}

	private static async urlToRecord(url: string): Promise<DeckRecord> {
		const deckRecord: DeckRecord = {
			extra: {},
			monster: {},
			side: {},
			spell: {},
			trap: {}
		};
		const components = url.slice("ydke://".length).split("!");
		const main = Deck.toPasscodes(components[0]);
		const extra = Deck.toPasscodes(components[1]);
		const side = Deck.toPasscodes(components[2]);
		for (const code of main) {
			const card = await data.getCard(code, "en");
			if (card) {
				if (card.data.isType(enums.type.TYPE_MONSTER)) {
					if (code in deckRecord.monster) {
						deckRecord.monster[code]++;
					} else {
						deckRecord.monster[code] = 1;
					}
				} else if (card.data.isType(enums.type.TYPE_SPELL)) {
					if (code in deckRecord.spell) {
						deckRecord.spell[code]++;
					} else {
						deckRecord.spell[code] = 1;
					}
				} else if (card.data.isType(enums.type.TYPE_TRAP)) {
					if (code in deckRecord.trap) {
						deckRecord.trap[code]++;
					} else {
						deckRecord.trap[code] = 1;
					}
				}
			}
		}

		for (const code of extra) {
			const card = await data.getCard(code, "en");
			if (card) {
				if (code in deckRecord.extra) {
					deckRecord.extra[code]++;
				} else {
					deckRecord.extra[code] = 1;
				}
			}
		}

		for (const code of side) {
			const card = await data.getCard(code, "en");
			if (card) {
				if (code in deckRecord.side) {
					deckRecord.side[code]++;
				} else {
					deckRecord.side[code] = 1;
				}
			}
		}

		return deckRecord;
	}

	private async urlToRecord(): Promise<DeckRecord> {
		return await Deck.urlToRecord(this.url);
	}

	private static async ydkToRecord(ydk: string): Promise<DeckRecord> {
		const deckRecord: DeckRecord = {
			extra: {},
			monster: {},
			side: {},
			spell: {},
			trap: {}
		};

		let currentSection = "";
		for (const line of ydk.split(/\r|\n|\r\n/)) {
			if (line.startsWith("#") || line.startsWith("!")) {
				currentSection = line.slice(1);
				continue;
			}
			if (line.trim().length > 0) {
				const card = await data.getCard(line, "en");
				if (card) {
					const code = card.id;
					if (currentSection === "side") {
						if (code in deckRecord.side) {
							deckRecord.side[code]++;
						} else {
							deckRecord.side[code] = 1;
						}
					} else if (currentSection === "extra") {
						if (code in deckRecord.extra) {
							deckRecord.extra[code]++;
						} else {
							deckRecord.extra[code] = 1;
						}
					} else if (currentSection === "main") {
						if (card.data.isType(enums.type.TYPE_MONSTER)) {
							if (code in deckRecord.monster) {
								deckRecord.monster[code]++;
							} else {
								deckRecord.monster[code] = 1;
							}
						} else if (card.data.isType(enums.type.TYPE_SPELL)) {
							if (code in deckRecord.spell) {
								deckRecord.spell[code]++;
							} else {
								deckRecord.spell[code] = 1;
							}
						} else if (card.data.isType(enums.type.TYPE_TRAP)) {
							if (code in deckRecord.trap) {
								deckRecord.trap[code]++;
							} else {
								deckRecord.trap[code] = 1;
							}
						}
					}
				}
			}
		}

		return deckRecord;
	}

	private async ydkToRecord(): Promise<DeckRecord> {
		return await Deck.ydkToRecord(this.ydk);
	}

	private static btoa(str: number | string | Buffer): string {
		let buffer;

		if (str instanceof Buffer) {
			buffer = str;
		} else {
			buffer = Buffer.from(str.toString(), "binary");
		}

		return buffer.toString("base64");
	}

	private static toBase64(array: Uint32Array): string {
		return Deck.btoa(
			Array.from(new Uint8Array(array.buffer))
				.map(function (i) {
					return String.fromCharCode(i);
				})
				.join("")
		);
	}

	private recordToUrl(): string {
		const main: number[] = [];
		for (const code in this.record.monster) {
			for (let i = 0; i < this.record.monster[code]; i++) {
				main.push(parseInt(code, 10));
			}
		}
		for (const code in this.record.spell) {
			for (let i = 0; i < this.record.spell[code]; i++) {
				main.push(parseInt(code, 10));
			}
		}
		for (const code in this.record.trap) {
			for (let i = 0; i < this.record.trap[code]; i++) {
				main.push(parseInt(code, 10));
			}
		}
		const extra: number[] = [];
		for (const code in this.record.extra) {
			for (let i = 0; i < this.record.extra[code]; i++) {
				extra.push(parseInt(code, 10));
			}
		}
		const side: number[] = [];
		for (const code in this.record.side) {
			for (let i = 0; i < this.record.side[code]; i++) {
				side.push(parseInt(code, 10));
			}
		}
		return (
			"ydke://" +
			Deck.toBase64(Uint32Array.from(main)) +
			"!" +
			Deck.toBase64(Uint32Array.from(extra)) +
			"!" +
			Deck.toBase64(Uint32Array.from(side)) +
			"!"
		);
	}

	private recordToYdk(): string {
		let ydk = "#created by Akira bot\n#main\n";
		for (const code in this.record.monster) {
			ydk += (code + "\n").repeat(this.record.monster[code]);
		}
		for (const code in this.record.spell) {
			ydk += (code + "\n").repeat(this.record.spell[code]);
		}
		for (const code in this.record.trap) {
			ydk += (code + "\n").repeat(this.record.trap[code]);
		}
		ydk += "#extra\n";
		for (const code in this.record.extra) {
			ydk += (code + "\n").repeat(this.record.extra[code]);
		}
		ydk += "!side\n";
		for (const code in this.record.side) {
			ydk += (code + "\n").repeat(this.record.extra[code]);
		}
		return ydk;
	}
}
