export interface WebsiteWrapper {
	createTournament(name: string, desc: string): WebsiteTournament;
}

// interface structure WIP as fleshed out command-by-command
export interface WebsiteTournament {
	id: string;
	name: string;
	desc: string;
	url: string;
}

export class WebsiteInterface {
	private api: WebsiteWrapper;
	constructor(api: WebsiteWrapper) {
		this.api = api;
	}

	public async createTournament(name: string, desc: string): Promise<WebsiteTournament> {
		return this.api.createTournament(name, desc);
	}
}

// TODO: Rename to "website" when a wrapper is implemented
export const dummyWebsite = new WebsiteInterface();
