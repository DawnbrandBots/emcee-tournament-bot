import { stringify } from "querystring";

export interface WebsiteWrapper {
	createTournament(name: string, desc: string): WebsiteTournament;
}

export interface WebsiteTournament {}

export class WebsiteInterface {
	private api: WebsiteWrapper;
	constructor(api: WebsiteWrapper) {
		this.api = api;
	}

	public createTournament(name: string, desc: string): WebsiteTournament {
		return this.api.createTournament(name, desc);
	}
}
