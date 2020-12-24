import { getDeck } from "./deck";
import fetch from "node-fetch";
import { DeckNotFoundError } from "../util/errors";
import { DiscordAttachmentOut, DiscordMessageIn, DiscordMessageOut } from "../discord/interface";
import { Deck, UrlConstructionError } from "ydeck";
import { DeckError } from "ydeck/dist/validation";
import { splitText } from "../discord/interface";

async function extractYdk(msg: DiscordMessageIn): Promise<string> {
	const attach = msg.attachments[0]; // msg having attachments is checked before this function is called
	const file = await fetch(attach.url);
	const ydk = await file.text();
	return ydk;
}

export async function getDeckFromMessage(msg: DiscordMessageIn): Promise<Deck> {
	if (msg.attachments.length > 0 && msg.attachments[0].filename.endsWith(".ydk")) {
		const ydk = await extractYdk(msg);
		const url = Deck.ydkToUrl(ydk);
		return await getDeck(url);
	}
	try {
		return await getDeck(msg.content); // This function will parse out a ydke URL if present
	} catch (e) {
		if (e instanceof UrlConstructionError) {
			throw new DeckNotFoundError();
		} else {
			throw e;
		}
	}
}

function capFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseDeckError(err: DeckError): string {
	if (err.type === "size") {
		return `${capFirst(err.target)} Deck too ${err.min ? "small" : "large"}! Should be at ${
			err.min ? `least ${err.min}` : `most ${err.max}`
		}, is ${err.actual}!`;
	}
	// else type is limit
	return `Too many copies of card ${err.name} (${err.target})! Should be at most ${err.max}, is ${err.actual}!`;
}

export function prettyPrint(deck: Deck, filename: string): [DiscordMessageOut, DiscordAttachmentOut] {
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
		embed.fields.push({ name: "Deck is illegal!", value: deck.validationErrors.map(parseDeckError).join("\n") });
	}

	const file: DiscordAttachmentOut = {
		contents: deck.ydk,
		filename: filename
	};
	return [embed, file];
}
