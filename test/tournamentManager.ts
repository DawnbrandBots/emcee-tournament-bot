import { DiscordInterface } from "../src/discord/interface";
import logger from "../src/logger";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteInterface } from "../src/website/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import { WebsiteWrapperMock } from "./mocks/website";
import { DatabaseWrapperMock } from "./mocks/database";
import { DatabaseInterface } from "../src/database/interface";
import { expect } from "chai";

const discord = new DiscordWrapperMock(); // will be used to fetch responses in some cases
const mockDiscord = new DiscordInterface(discord, "mc!", logger);

const mockDbWrapper = new DatabaseWrapperMock();
const mockDb = new DatabaseInterface(mockDbWrapper);

const mockWebsiteWrapper = new WebsiteWrapperMock();
const mockWebsite = new WebsiteInterface(mockWebsiteWrapper);

const tournament = new TournamentManager(mockDiscord, mockDb, mockWebsite, logger);

describe("Tournament creation commands", function () {
	it("Create tournament");
	it("Update tournament");
	it("Add announcement channel");
	it("Remove announcement channel");
	it("Add host");
	it("Remove host");
});

describe("Tournament flow commands", function () {
	it("Open tournament");
	it("Start tournament");
	it("Cancel tournament");
	it("Submit score");
	it("Next round");
});

describe("Misc commands", function () {
	it("List tournaments", async function () {
		const list = await tournament.listTournaments();
		expect(list).to.equal(
			"ID: tourn1|Name: Tournament 1|Status: preparing|Players: 2\nID: tourn2|Name: Tournament 2|Status: preparing|Players: 2"
		);
	});
	it("List players");
	it("Get player deck");
	it("Drop player");
	it("Sync tournament");
	it("Generate pie chart");
});

describe("Misc functions", function () {
	it("Confirm player");
	it("Clean registration");
	it("Authenticate host", function () {
		expect(async () => await tournament.authenticateHost("mc_name", "testUser")).to.not.throw;
	});
	it("Authenticate player", function () {
		expect(async () => await tournament.authenticatePlayer("mc_name", "testUser")).to.not.throw;
	});
});
