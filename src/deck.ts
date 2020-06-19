import { Message, MessageFile, MessageContent } from "eris";
import fetch from "node-fetch";
import { TypedDeck, parseURL, toURL, extractURLs } from "ydke";
import { data } from "./data";
import { enums } from "ygopro-data";

interface DeckProfile {
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

type ProfileCounts = { [name: string]: number };

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
		const matches = extractURLs(msg.content);
		if (matches.length === 0) {
			throw new Error("Must provide either attached `.ydk` file or valid `ydke://` URL!");
		}
		const ydke = matches[0];
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
		for (const code of record.main) {
			ydk += code + "\n";
		}
		ydk += "#extra\n";
		for (const code of record.extra) {
			ydk += code + "\n";
		}
		ydk += "!side\n";
		for (const code of record.side) {
			ydk += code + "\n";
		}
		return ydk;
	}

	private static increment(obj: ProfileCounts, key: string): void {
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
		if (this.record.main.length < 40) {
			errors.push("Main Deck too small! Should be at least 40, is " + this.record.main.length + ".");
		}
		if (this.record.main.length > 60) {
			errors.push("Main Deck too large! Should be at most 60, is " + this.record.main.length + ".");
		}
		if (this.record.extra.length > 15) {
			errors.push("Extra Deck too large! Should be at most 15, is " + this.record.extra.length + ".");
		}
		if (this.record.side.length > 15) {
			errors.push("Side Deck too large! Should be at most 15, is " + this.record.side.length + ".");
		}
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
				errors.push("Too many copies of " + name + "! Should be at most " + count + ", is " + nameCounts[code] + ".");
			}
		}

		return errors;
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

	public static async sendProfile(msg: Message): Promise<Message> {
		const deck = await Deck.construct(msg);
		const profile = await deck.getProfile();

		const title = "Contents of your deck:\n";
		const mainCount = profile.typeCounts.main.monster + profile.typeCounts.main.spell + profile.typeCounts.main.trap;
		let mainHeader = "Main Deck (" + mainCount + " cards - ";
		const mainHeaderParts: string[] = [];
		if (profile.typeCounts.main.monster > 0) {
			mainHeaderParts.push(profile.typeCounts.main.monster + " Monsters");
		}
		if (profile.typeCounts.main.spell > 0) {
			mainHeaderParts.push(profile.typeCounts.main.spell + " Spells");
		}
		if (profile.typeCounts.main.trap > 0) {
			mainHeaderParts.push(profile.typeCounts.main.trap + " Traps");
		}
		mainHeader += mainHeaderParts.join(", ") + ")";
		let mainBody = "";
		for (const name in profile.nameCounts.main) {
			mainBody += profile.nameCounts.main[name] + " " + name + "\n";
		}

		const extraCount =
			profile.typeCounts.extra.fusion +
			profile.typeCounts.extra.synchro +
			profile.typeCounts.extra.xyz +
			profile.typeCounts.extra.link;
		let extraHeader = "Extra Deck (" + extraCount + " cards - ";
		const extraHeaderParts: string[] = [];
		if (profile.typeCounts.extra.fusion > 0) {
			extraHeaderParts.push(profile.typeCounts.extra.fusion + " Fusion");
		}
		if (profile.typeCounts.extra.synchro > 0) {
			extraHeaderParts.push(profile.typeCounts.extra.synchro + " Synchro");
		}
		if (profile.typeCounts.extra.xyz > 0) {
			extraHeaderParts.push(profile.typeCounts.extra.xyz + " Xyz");
		}
		if (profile.typeCounts.extra.link > 0) {
			extraHeaderParts.push(profile.typeCounts.extra.link + " Link");
		}
		extraHeader += extraHeaderParts.join(", ") + ")";
		let extraBody = "";
		for (const name in profile.nameCounts.extra) {
			extraBody += profile.nameCounts.extra[name] + " " + name + "\n";
		}

		const sideCount = profile.typeCounts.side.monster + profile.typeCounts.side.spell + profile.typeCounts.side.trap;
		let sideHeader = "Side Deck (" + sideCount + " cards - ";
		const sideHeaderParts: string[] = [];
		if (profile.typeCounts.side.monster > 0) {
			sideHeaderParts.push(profile.typeCounts.side.monster + " Monsters");
		}
		if (profile.typeCounts.main.spell > 0) {
			sideHeaderParts.push(profile.typeCounts.side.spell + " Spells");
		}
		if (profile.typeCounts.main.trap > 0) {
			sideHeaderParts.push(profile.typeCounts.side.trap + " Traps");
		}
		sideHeader += sideHeaderParts.join(", ") + ")";
		let sideBody = "";
		for (const name in profile.nameCounts.side) {
			sideBody += profile.nameCounts.side[name] + " " + name + "\n";
		}
		const errors = await deck.validate();

		const out: MessageContent = {
			embed: { title, fields: [] }
		};
		if (out.embed && out.embed.fields) {
			if (mainCount > 0) {
				const mainOuts = Deck.messageCapSlice(mainBody, 1024);
				for (let i = 0; i < mainOuts.length; i++) {
					out.embed.fields.push({ name: mainHeader + (i > 0 ? " (Continued)" : ""), value: mainOuts[i] });
				}
			}
			if (extraCount > 0) {
				const extraOuts = Deck.messageCapSlice(extraBody, 1024);
				for (let i = 0; i < extraOuts.length; i++) {
					out.embed.fields.push({ name: extraHeader + (i > 0 ? " (Continued)" : ""), value: extraOuts[i] });
				}
			}
			if (sideCount > 0) {
				const sideOuts = Deck.messageCapSlice(sideBody, 1024);
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
			name: msg.author.username + msg.author.discriminator + ".ydk"
		};
		return await msg.channel.createMessage(out, file);
	}
}
