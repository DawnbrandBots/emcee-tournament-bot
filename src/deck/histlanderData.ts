import { MiscInternalError } from "../tournament";
import * as unbound from "./unbound.json";
import { data } from "../data";
import { enums } from "ygopro-data";

export async function isUnbound(code: string): Promise<boolean> {
	if (unbound.includes(code)) {
		return true;
	}
	const card = await data.getCard(code, "en");
	if (!card) {
		return false;
	}
	// non-effect non-pendulum monsters
	return !(card.data.isType(enums.type.TYPE_PENDULUM) || card.data.isType(enums.type.TYPE_EFFECT));
}

export function isHistBanned(code: string): boolean {
	throw new MiscInternalError("Not yet implemented!");
}
