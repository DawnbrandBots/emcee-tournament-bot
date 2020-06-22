import { Deck, ProfileCounts } from ".";
import { data } from "../data";
import { isUnbound, isHistBanned } from "./histlanderData";

export class HistlanderDeck extends Deck {
	protected validateLength(): string[] {
		const errors = [];
		if (super.record.main.length < 30) {
			errors.push(`Main Deck too small! Should be at least 30, is ${super.record.main.length}.`);
		}
		if (super.record.main.length > 60) {
			errors.push(`Main Deck too large! Should be at most 60, is ${super.record.main.length}.`);
		}
		if (super.record.extra.length > 15) {
			errors.push(`Extra Deck too large! Should be at most 15, is ${super.record.extra.length}.`);
		}
		if (super.record.side.length > 0) {
			errors.push(`Side Deck too large! Should be at most 0, is ${super.record.side.length}.`);
		}
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
			let count = 1;
			if (isUnbound(code)) {
				count = 3;
			}
			if (isHistBanned(code)) {
				count = 0;
			}
			if (nameCounts[code] > count) {
				let name: string;
				const card = await data.getCard(code, "en");
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
}
