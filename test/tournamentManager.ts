import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client } from "discord.js";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { ParticipantRoleProvider } from "../src/role/participant";
import { Templater } from "../src/templates";
import { TimeWizard } from "../src/timer";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteInterface } from "../src/website/interface";
import { DatabaseWrapperMock } from "./mocks/database";
import { WebsiteWrapperMock } from "./mocks/website";

dotenv.config();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const mockDb = new DatabaseWrapperMock();

const mockWebsiteWrapper = new WebsiteWrapperMock();
const mockWebsite = new WebsiteInterface(mockWebsiteWrapper);

const templater = new Templater();
const participantRole = new ParticipantRoleProvider(new Client({ intents: [] }));

sinon.stub(participantRole, "get").resolves("role");
sinon.stub(participantRole, "grant").resolves();
sinon.stub(participantRole, "ungrant").resolves();
sinon.stub(participantRole, "delete").resolves();

let tournament: TournamentManager;
before(async () => {
	tournament = new TournamentManager(
		mockDb,
		mockWebsite,
		templater,
		participantRole,
		new TimeWizard({
			sendMessage: sinon.stub(),
			editMessage: sinon.stub()
		})
	);
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
