import { Message } from "eris";
import fetch from "node-fetch";
import { TypedDeck, parseURL, toURL } from "ydke";

export class Deck {
	readonly url: string;
	readonly ydk: string;
	private record: TypedDeck;
	constructor(record: TypedDeck, url?: string, ydk?: string) {
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

	private static async constructFromFile(msg: Message): Promise<Deck> {
		const ydk = await Deck.messageToYdk(msg);
		const record = Deck.ydkToRecord(ydk);
		return new Deck(record, undefined, ydk);
	}

	private static constructFromUrl(url: string): Deck {
		const record = Deck.urlToRecord(url);
		return new Deck(record, url, undefined);
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

	private recordToUrl(): string {
		return toURL(this.record);
	}

	private recordToYdk(): string {
		let ydk = "#created by Akira bot\n#main\n";
		for (const code in this.record.main) {
			ydk += code + "\n";
		}
		ydk += "#extra\n";
		for (const code in this.record.extra) {
			ydk += code + "\n";
		}
		ydk += "!side\n";
		for (const code in this.record.side) {
			ydk += code + "\n";
		}
		return ydk;
	}
}
