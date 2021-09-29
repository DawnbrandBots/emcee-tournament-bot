import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import sinonChai from "sinon-chai";
import { Templater } from "../src/templates";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteWrapperChallonge } from "../src/website/challonge";
import { DatabaseWrapperMock } from "./mocks/database";

dotenv.config();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const mockDb = new DatabaseWrapperMock();

const mockWebsiteWrapper = new WebsiteWrapperChallonge("", ""); // dummy parameters won't matter because we'll stub any functions we use

const templater = new Templater();

let tournament: TournamentManager;
before(async () => {
	tournament = new TournamentManager(mockDb, mockWebsiteWrapper, templater);
	await templater.load("guides");
});

describe("Tournament creation commands", async function () {
	it("Create tournament", async function () {
		const [id, url, guide] = await tournament.createTournament("testUser", "testServer", "create", "desc");
		const baseGuide = await fs.readFile("guides/create.template.md", "utf-8");
		expect(id).to.equal("create");
		expect(url).to.equal("https://example.com/create");
		expect(guide).to.equal(baseGuide.replace(/{}/g, "create"));
	});
	it("Create tournament - taken URL", async function () {
		const [id] = await tournament.createTournament("testUser", "testServer", "create1", "desc");
		expect(id).to.equal("create10");
	});
});
