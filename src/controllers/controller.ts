import { Challonge } from "../challonge";

export default abstract class Controller {
	protected challonge: Challonge;

	constructor(challonge: Challonge) {
		this.challonge = challonge;
	}
}

export interface SendMessageFunction {
	(message: string): Promise<void>
}
