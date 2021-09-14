import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client } from "discord.js";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { DiscordInterface } from "../src/discord/interface";
import { ParticipantRoleProvider } from "../src/role/participant";
import { Templater } from "../src/templates";
import { TimeWizard } from "../src/timer";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteInterface } from "../src/website/interface";
import { DatabaseWrapperMock } from "./mocks/database";
import { DiscordWrapperMock } from "./mocks/discord";
import { WebsiteWrapperMock } from "./mocks/website";

dotenv.config();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const discord = new DiscordWrapperMock(); // will be used to fetch responses in some cases
const mockDiscord = new DiscordInterface(discord);

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
		mockDiscord,
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

async function noop(): Promise<void> {
	return;
}

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

describe("Tournament flow commands", function () {
	it("Cancel tournament", async function () {
		await tournament.finishTournament("tourn2", true);
		// same message as normal finish
		expect(discord.getResponse("channel1")).to.equal(
			"Tournament 2 has concluded! Thank you all for playing! <@&role>\nResults: https://example.com/url"
		);
	});
});

describe("Misc functions", function () {
	it("Clean registration", async function () {
		await expect(
			tournament.cleanRegistration({
				id: "testMsg",
				channelId: "testChannel"
			})
		).to.not.be.rejected;
	});
});
