import { expect } from "chai";
import { WebsiteInterface, WebsiteTournament } from "../src/website/interface";
import { WebsiteWrapperMock } from "./mocks/website";

const websiteMock = new WebsiteWrapperMock();
const website = new WebsiteInterface(websiteMock);

describe("Tournament creation commands", function () {
	it("createTournament", async function () {
		const response = await website.createTournament("Test Tournament", "Tournament description.", "mc_test");
		const expectedResponse: WebsiteTournament = {
			rounds: 3,
			url: "https://example.com/mc_test",
			id: "mc_test",
			players: [],
			desc: "Tournament description.",
			name: "Test Tournament"
		};
		expect(response).to.deep.equal(expectedResponse);
	});

	it("updateTournament");

	it("getTournament");

	it("registerPlayer");
});

describe("Tournament flow commands", function () {
	it("startTournament");

	it("getBye");

	it("findMatch");

	it("removePlayer");

	it("submitScore");

	it("tieMatches");

	it("finishTournament");
});

describe("Misc functions", function () {
	it("getTopCut");

	it("assignByes");

	it("dropByes");
});
