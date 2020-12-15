import chai, { expect } from "chai";
import { DatabaseInterface } from "../src/database/interface";
import { DatabaseWrapperMock } from "./mocks/database";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const databaseMock = new DatabaseWrapperMock();
const database = new DatabaseInterface(databaseMock);

describe("Tournament creation", function () {
	it("createTournament", async function () {
		const tournament = await database.createTournament("testHost", "testServer", {
			id: "mc_test",
			name: "Test tournament",
			desc: "A sample tournament",
			url: "https://example.com/mc_test",
			players: [],
			rounds: 3
		});
		expect(tournament.id).to.equal("mc_test");
		expect(tournament.name).to.equal("Test tournament");
		expect(tournament.description).to.equal("A sample tournament");
		expect(tournament.status).to.equal("preparing");
		expect(tournament.players.length).to.equal(0);
		expect(tournament.publicChannels.length).to.equal(0);
		expect(tournament.privateChannels.length).to.equal(0);
		expect(tournament.hosts[0]).to.equal("testHost");
		expect(tournament.server).to.equal("testServer");
		expect(tournament.byes.length).to.equal(0);
	});

	it("updateTournament", async function () {
		await expect(database.updateTournament("mc_test", "newName", "new desc")).to.not.be.rejected;
	});

	it("addAnnouncementChannel", async function () {
		await expect(database.addAnnouncementChannel("mc_test", "testChannel", "public")).to.not.be.rejected;
	});

	it("removeAnnouncementChannel", async function () {
		await expect(database.removeAnnouncementChannel("mc_test", "testChannel", "public")).to.not.be.rejected;
	});

	it("addHost", async function () {
		await expect(database.addHost("mc_test", "testHost")).to.not.be.rejected;
	});

	it("removeHost", async function () {
		await expect(database.removeHost("mc_test", "testHost")).to.not.be.rejected;
	});

	it("registerBye", async function () {
		await expect(database.registerBye("mc_test", "testPlayer")).to.not.be.rejected;
	});

	it("removeBye", async function () {
		await expect(database.removeBye("mc_test", "testPlayer")).to.not.be.rejected;
	});
});

describe("Player registration", function () {
	it("openRegistration");

	it("getRegisterMessages");

	it("cleanRegistration");

	it("getPendingTournaments");

	it("addPendingPlayer");

	it("removePendingPlayer");

	it("confirmPlayer");

	it("removeConfirmedPlayerReaction");

	it("removeConfirmedPlayerForce");
});

describe("Tournament flow", function () {
	it("startTournament");

	it("nextRound");

	it("finishTournament");
});

describe("Misc functions", function () {
	it("authenticateHost");

	it("authenticatePlayer");

	it("listTournaments");

	it("getTournament");

	it("synchronise");
});
