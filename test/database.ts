import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DatabaseInterface } from "../src/database/interface";
import { UnauthorisedHostError, UnauthorisedPlayerError } from "../src/util/errors";
import { DatabaseWrapperMock } from "./mocks/database";

chai.use(chaiAsPromised);

const databaseMock = new DatabaseWrapperMock();
const database = new DatabaseInterface(databaseMock);

describe("Tournament creation", function () {
	it("createTournament", async function () {
		const tournament = await database.createTournament("testHost", "testServer", {
			id: "test",
			name: "Test tournament",
			desc: "A sample tournament",
			url: "https://example.com/test",
			players: [],
			rounds: 3
		});
		expect(tournament.id).to.equal("test");
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
		await expect(database.updateTournament("test", "newName", "new desc")).to.not.be.rejected;
	});

	it("addAnnouncementChannel", async function () {
		await expect(database.addAnnouncementChannel("test", "testChannel", "public")).to.not.be.rejected;
	});

	it("removeAnnouncementChannel", async function () {
		await expect(database.removeAnnouncementChannel("test", "testChannel", "public")).to.not.be.rejected;
	});

	it("addHost", async function () {
		await expect(database.addHost("test", "testHost")).to.not.be.rejected;
	});

	it("removeHost", async function () {
		await expect(database.removeHost("test", "testHost")).to.not.be.rejected;
	});

	it("registerBye", async function () {
		await expect(database.registerBye("test", "testPlayer")).to.not.be.rejected;
	});

	it("removeBye", async function () {
		await expect(database.removeBye("test", "testPlayer")).to.not.be.rejected;
	});
});

describe("Player registration", function () {
	it("openRegistration", async function () {
		await expect(database.openRegistration("test", "testChannel", "testMessage")).to.not.be.rejected;
	});

	it("getRegisterMessages", async function () {
		const messages = await database.getRegisterMessages("test");
		expect(messages.length).to.equal(0);
	});

	it("cleanRegistration", async function () {
		await expect(database.cleanRegistration("testChannel", "testMessage")).to.not.be.rejected;
	});

	it("getPendingTournaments", async function () {
		const tournaments = await database.getPendingTournaments("s");
		expect(tournaments.length).to.equal(0);
	});

	it("addPendingPlayer", async function () {
		const tournament = await database.addPendingPlayer("testChannel", "testMessage", "testPlayer");
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});

	it("removePendingPlayer", async function () {
		const tournament = await database.removePendingPlayer("testChannel", "testMessage", "testPlayer");
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});

	it("confirmPlayer", async function () {
		await expect(database.confirmPlayer("test", "testPlayer", 1, "")).to.not.be.rejected;
	});

	it("removeConfirmedPlayerReaction", async function () {
		const tournament = await database.removeConfirmedPlayerReaction("testChannel", "testMessage", "testPlayer");
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});

	it("removeConfirmedPlayerForce", async function () {
		const tournament = await database.removeConfirmedPlayerForce("tourn1", "testPlayer");
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});
});

describe("Tournament flow", function () {
	it("startTournament", async function () {
		const droppedPlayers = await database.startTournament("test");
		expect(droppedPlayers.length).to.equal(0);
	});

	it("finishTournament", async function () {
		await expect(database.finishTournament("test")).to.not.be.rejected;
	});
});

describe("Misc functions", function () {
	it("authenticateHost", async function () {
		await expect(database.authenticateHost("tourn1", "testHost")).to.not.be.rejected;
	});

	it("authenticateHost - failed", async function () {
		await expect(database.authenticateHost("tourn1", "notHost")).to.be.rejectedWith(UnauthorisedHostError);
	});

	it("authenticatePlayer", async function () {
		await expect(database.authenticatePlayer("tourn1", "player1")).to.not.be.rejected;
	});

	it("authenticatePlayer - failed", async function () {
		await expect(database.authenticatePlayer("tourn1", "notPlayer")).to.be.rejectedWith(UnauthorisedPlayerError);
	});

	it("listTournaments", async function () {
		const tournaments = await database.listTournaments();
		const tournament = tournaments[0];
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});

	it("getTournament", async function () {
		const tournament = await database.getTournament("tourn1");
		expect(tournament?.id).to.equal("tourn1");
		expect(tournament?.name).to.equal("Tournament 1");
		expect(tournament?.description).to.equal("The first tournament");
		expect(tournament?.status).to.equal("preparing");
		expect(tournament?.players).to.deep.equal(["player1", "player2", "sJustRight", "sTooMany"]);
		expect(tournament?.publicChannels[0]).to.equal("channel1");
		expect(tournament?.privateChannels[0]).to.equal("channel2");
		expect(tournament?.hosts[0]).to.equal("host1");
		expect(tournament?.server).to.equal("testServer");
		expect(tournament?.byes[0]).to.equal("player1");
	});

	it("synchronise", async function () {
		await expect(
			database.synchronise("test", {
				name: "newName",
				description: "newDesc",
				players: [{ challongeId: 1, discordId: "DUMMY0" }]
			})
		).to.not.be.rejected;
	});
});
