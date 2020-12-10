import logger from "../logger";
import { DiscordWrapperEris } from "./eris";
import { DiscordInterface } from "./interface";
import { prefix } from "../config/config.json";

const eris = new DiscordWrapperEris(logger);
export const discord = new DiscordInterface(eris, prefix, logger);

// utility function relevant for Discord message caps
export function splitText(outString: string, cap = 2000): string[] {
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
