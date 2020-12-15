import chai, { expect } from "chai";
import { WebsiteInterface } from "../src/website/interface";
import { WebsiteWrapperMock } from "./mocks/website";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const websiteMock = new WebsiteWrapperMock();
const website = new WebsiteInterface(websiteMock);

describe("Tournament creation commands", function () {
	it("createTournament", async function () {
		const tournament = await website.createTournament("Test Tournament", "Tournament description.", "mc_test");
		expect(tournament).to.deep.equal({
			rounds: 3,
			url: "https://example.com/mc_test",
			id: "mc_test",
			players: [],
			desc: "Tournament description.",
			name: "Test Tournament"
		});
	});

	it("updateTournament", async function () {
		await expect(website.updateTournament("mc_test", "New name", "New descriptoin")).to.not.be.rejected;
	});

	it("getTournament", async function () {
		const tournament = await website.getTournament("mc_test");
		expect(tournament).to.deep.equal({
			id: "mc_test",
			name: "name",
			desc: "desc",
			url: `https://example.com/url`,
			players: [],
			rounds: 3
		});
	});

	it("registerPlayer", async function () {
		const id = await website.registerPlayer("mc_test", "Player 1", "player1");
		expect(id).to.equal(1);
	});
});

describe("Tournament flow commands", function () {
	it("startTournament", async function () {
		await expect(website.startTournament("mc_test")).to.not.be.rejected;
	});

	it("getBye", async function () {
		const bye = await website.getBye("mc_test");
		expect(bye).to.be.undefined;
	});

	it("findMatch", async function () {
		const match = await website.findMatch("mc_test", 1);
		expect(match).to.deep.equal({
			player1: 1,
			player2: 2,
			matchId: 0
		});
	});

	it("removePlayer", async function () {
		await expect(website.removePlayer("mc_test", 1)).to.not.be.rejected;
	});

	it("submitScore", async function () {
		await expect(website.submitScore("mc_test", 1, 2, 1)).to.not.be.rejected;
	});

	it("tieMatches", async function () {
		await expect(website.tieMatches("mc_test")).to.not.be.rejected;
	});

	it("finishTournament", async function () {
		const tournament = await website.finishTournament("mc_test");
		expect(tournament).to.deep.equal({
			id: "mc_test",
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
		const top = await website.getTopCut("mc_test", 0);
		expect(top.length).to.equal(0);
	});

	it("assignByes", async function () {
		await expect(website.assignByes("mc_test", 0, [])).to.not.be.rejected;
	});

	it("dropByes", async function () {
		await expect(website.dropByes("mc_test", 0)).to.not.be.rejected;
	});
});
