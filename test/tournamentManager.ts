import { DiscordInterface } from "../src/discord/interface";
import logger from "../src/logger";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteInterface } from "../src/website/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import { WebsiteWrapperMock } from "./mocks/website";
import { DatabaseWrapperMock } from "./mocks/database";
import { DatabaseInterface } from "../src/database/interface";

const discord = new DiscordWrapperMock(); // will be used to fetch responses in some cases
const mockDiscord = new DiscordInterface(discord, "mc!", logger);

const mockDbWrapper = new DatabaseWrapperMock();
const mockDb = new DatabaseInterface(mockDbWrapper);

const mockWebsiteWrapper = new WebsiteWrapperMock();
const mockWebsite = new WebsiteInterface(mockWebsiteWrapper);

const tournament = new TournamentManager(mockDiscord, mockDb, mockWebsite, logger);

describe("Misc functions", function () {
	it("Confirm player");
	it("Clean registration");
	it("Authenticate host");
	it("Authenticate player");
});

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
	it("List tournaments");
	it("List players");
	it("Get player deck");
	it("Drop player");
	it("Sync tournament");
	it("Generate pie chart");
});
