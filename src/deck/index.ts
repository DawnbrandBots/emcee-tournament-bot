import { TypedDeck, parseURL, toURL } from "ydke";
import { data } from "../data";
import { enums } from "ygopro-data";

export interface DeckProfile {
	nameCounts: {
		main: ProfileCounts;
		extra: ProfileCounts;
		side: ProfileCounts;
	};
	typeCounts: {
		main: ProfileCounts;
		extra: ProfileCounts;
		side: ProfileCounts;
	};
	archetypes: string[];
	ydk: string;
	url: string;
}

export type ProfileCounts = { [name: string]: number };

export class Deck {
	readonly url: string;
	readonly ydk: string;
	readonly record: TypedDeck;
	constructor(record: TypedDeck, url: string, ydk: string) {
		this.record = record;
		this.url = url;
		this.ydk = ydk;
	}

	public static async constructFromYdk(ydk: string): Promise<Deck> {
		const record = Deck.ydkToRecord(ydk);
		const url = Deck.recordToUrl(record);
		return new Deck(record, url, ydk);
	}

	public static constructFromUrl(url: string): Deck {
		const record = Deck.urlToRecord(url);
		const ydk = Deck.recordToYdk(record);
		return new Deck(record, url, ydk);
	}

	public static constructFromRecord(record: TypedDeck): Deck {
		const ydk = Deck.recordToYdk(record);
		const url = Deck.recordToUrl(record);
		return new Deck(record, url, ydk);
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
		let ydk = "#created by Emcee bot\n#main\n";
		for (const code of record.main) {
			ydk += `${code}\n`;
		}
		ydk += "#extra\n";
		for (const code of record.extra) {
			ydk += `${code}\n`;
		}
		ydk += "!side\n";
		for (const code of record.side) {
			ydk += `${code}\n`;
		}
		return ydk;
	}

	protected static increment(obj: ProfileCounts, key: string): void {
		if (key in obj) {
			obj[key]++;
		} else {
			obj[key] = 1;
		}
	}

	public async getProfile(): Promise<DeckProfile> {
		const mainTypeCounts: ProfileCounts = {
			monster: 0,
			spell: 0,
			trap: 0
		};
		const extraTypeCounts: ProfileCounts = {
			fusion: 0,
			synchro: 0,
			xyz: 0,
			link: 0
		};
		const sideTypeCounts: ProfileCounts = {
			monster: 0,
			spell: 0,
			trap: 0
		};

		const mainNameCounts: ProfileCounts = {};
		const extraNameCounts: ProfileCounts = {};
		const sideNameCounts: ProfileCounts = {};

		const archetypeCounts: ProfileCounts = {};

		for (const code of this.record.main) {
			const card = await data.getCard(code, "en");
			if (!card) {
				Deck.increment(mainNameCounts, code.toString());
				continue;
			}
			if ("en" in card.text) {
				Deck.increment(mainNameCounts, card.text.en.name);
				const sets = await card.data.names.en.setcode;
				for (const set of sets) {
					Deck.increment(archetypeCounts, set);
				}
			} else {
				Deck.increment(mainNameCounts, code.toString());
			}

			if (card.data.isType(enums.type.TYPE_MONSTER)) {
				Deck.increment(mainTypeCounts, "monster");
			} else if (card.data.isType(enums.type.TYPE_SPELL)) {
				Deck.increment(mainTypeCounts, "spell");
			} else if (card.data.isType(enums.type.TYPE_TRAP)) {
				Deck.increment(mainTypeCounts, "trap");
			}
		}

		for (const code of this.record.extra) {
			const card = await data.getCard(code, "en");
			if (!card) {
				Deck.increment(extraNameCounts, code.toString());
				continue;
			}
			if ("en" in card.text) {
				Deck.increment(extraNameCounts, card.text.en.name);
				const sets = await card.data.names.en.setcode;
				for (const set of sets) {
					Deck.increment(archetypeCounts, set);
				}
			} else {
				Deck.increment(extraNameCounts, code.toString());
			}

			if (card.data.isType(enums.type.TYPE_FUSION)) {
				Deck.increment(extraTypeCounts, "fusion");
			} else if (card.data.isType(enums.type.TYPE_SYNCHRO)) {
				Deck.increment(extraTypeCounts, "synchro");
			} else if (card.data.isType(enums.type.TYPE_XYZ)) {
				Deck.increment(extraTypeCounts, "xyz");
			} else if (card.data.isType(enums.type.TYPE_LINK)) {
				Deck.increment(extraTypeCounts, "link");
			}
		}

		for (const code of this.record.side) {
			const card = await data.getCard(code, "en");
			if (!card) {
				Deck.increment(sideNameCounts, code.toString());
				continue;
			}
			if ("en" in card.text) {
				Deck.increment(sideNameCounts, card.text.en.name);
			} else {
				Deck.increment(sideNameCounts, code.toString());
			}

			if (card.data.isType(enums.type.TYPE_MONSTER)) {
				Deck.increment(sideTypeCounts, "monster");
			} else if (card.data.isType(enums.type.TYPE_SPELL)) {
				Deck.increment(sideTypeCounts, "spell");
			} else if (card.data.isType(enums.type.TYPE_TRAP)) {
				Deck.increment(sideTypeCounts, "trap");
			}
		}

		const archetypes = [];
		for (const set in archetypeCounts) {
			if (archetypeCounts[set] > 9) {
				archetypes.push(set);
			}
		}

		return {
			nameCounts: {
				main: mainNameCounts,
				extra: extraNameCounts,
				side: sideNameCounts
			},
			typeCounts: {
				main: mainTypeCounts,
				extra: extraTypeCounts,
				side: sideTypeCounts
			},
			archetypes,
			ydk: this.ydk,
			url: this.url
		};
	}

	public async validate(): Promise<string[]> {
		const errors: string[] = [];
		errors.push(...this.validateLength());
		errors.push(...(await this.validateCounts()));
		return errors;
	}

	protected async validateCounts(): Promise<string[]> {
		const errors = [];
		const nameCounts: ProfileCounts = {};
		for (const code of this.record.main) {
			Deck.increment(nameCounts, code.toString());
		}
		for (const code of this.record.extra) {
			Deck.increment(nameCounts, code.toString());
		}
		for (const code of this.record.side) {
			Deck.increment(nameCounts, code.toString());
		}

		for (const code in nameCounts) {
			const card = await data.getCard(code, "en");
			let count = 3;
			if (card) {
				const status = await card.status;
				const result = /TCG: (\d)/.exec(status);
				if (result !== null) {
					count = parseInt(result[1], 10);
				}
			}
			if (nameCounts[code] > count) {
				let name: string;
				if (card && "en" in card.text) {
					name = card.text.en.name;
				} else {
					name = code;
				}
				errors.push(`Too many copies of ${name}! Should be at most ${count}, is ${nameCounts[code]}.`);
			}
		}
		return errors;
	}

	protected validateLength(): string[] {
		const errors = [];
		if (this.record.main.length < 40) {
			errors.push(`Main Deck too small! Should be at least 40, is ${this.record.main.length}.`);
		}
		if (this.record.main.length > 60) {
			errors.push(`Main Deck too large! Should be at most 60, is ${this.record.main.length}.`);
		}
		if (this.record.extra.length > 15) {
			errors.push(`Extra Deck too large! Should be at most 15, is ${this.record.extra.length}.`);
		}
		if (this.record.side.length > 15) {
			errors.push(`Side Deck too large! Should be at most 15, is ${this.record.side.length}.`);
		}
		return errors;
	}
}
