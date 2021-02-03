import chai, { expect } from "chai";
import { WebsiteInterface } from "../src/website/interface";
import { WebsiteWrapperMock } from "./mocks/website";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const websiteMock = new WebsiteWrapperMock();
const website = new WebsiteInterface(websiteMock);

describe("Tournament creation commands", function () {
	it("createTournament", async function () {
		const tournament = await website.createTournament("Test Tournament", "Tournament description.", "test");
		expect(tournament).to.deep.equal({
			rounds: 3,
			url: "https://example.com/test",
			id: "test",
			players: [],
			desc: "Tournament description.",
			name: "Test Tournament"
		});
	});

	it("updateTournament", async function () {
		await expect(website.updateTournament("test", "New name", "New descriptoin")).to.not.be.rejected;
	});

	it("getTournament", async function () {
		const tournament = await website.getTournament("test");
		expect(tournament).to.deep.equal({
			id: "test",
			name: "name",
			desc: "desc",
			url: `https://example.com/url`,
			players: [],
			rounds: 3
		});
	});

	it("registerPlayer", async function () {
		const id = await website.registerPlayer("test", "Player 1", "player1");
		expect(id).to.equal(1);
	});
});

describe("Tournament flow commands", function () {
	it("startTournament", async function () {
		await expect(website.startTournament("test")).to.not.be.rejected;
	});

	it("getBye - no bye", async function () {
		const bye = await website.getBye("test");
		expect(bye).to.be.undefined;
	});

	it("getBye - there is a bye", async function () {
		const bye = await website.getBye("bye");
		expect(bye).to.equal("bye");
	});

	it("findMatch", async function () {
		const match = await website.findMatch("test", 1);
		expect(match).to.deep.equal({
			player1: 1,
			player2: 2,
			matchId: 0,
			open: true,
			round: 1
		});
	});

	it("removePlayer", async function () {
		await expect(website.removePlayer("test", 1)).to.not.be.rejected;
	});

	it("submitScore", async function () {
		await expect(website.submitScore("test", 1, 2, 1)).to.not.be.rejected;
	});

	it("finishTournament", async function () {
		const tournament = await website.finishTournament("test");
		expect(tournament).to.deep.equal({
			id: "test",
			name: "name",
			desc: "desc",
			url: `https://example.com/url`,
			players: [],
			rounds: 3
		});
	});
});

describe("Misc functions", function () {
	it("getTopCut", async function () {
		const top = await website.getTopCut("test", 0);
		expect(top.length).to.equal(0);
	});

	it("assignByes - no byes", async function () {
		await expect(website.assignByes("test", [])).to.not.be.rejected;
	});

	it("assignByes - natural bye", async function () {
		await expect(website.assignByes("bye", ["player1"])).to.not.be.rejected;
	});

	it("dropByes - no byes", async function () {
		await expect(website.dropByes("test", 0)).to.not.be.rejected;
	});

	it("dropByes - there is a bye", async function () {
		await expect(website.dropByes("dummy", 1)).to.not.be.rejected;
	});
});
