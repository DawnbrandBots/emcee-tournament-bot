import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { Client } from "discord.js";
import * as fs from "fs/promises";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { DiscordInterface } from "../src/discord/interface";
import { ParticipantRoleProvider } from "../src/role/participant";
import { Templater } from "../src/templates";
import { TimeWizard } from "../src/timer";
import { TournamentManager } from "../src/TournamentManager";
import { UserError } from "../src/util/errors";
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
	it("Open tournament", async function () {
		await tournament.openTournament("tourn1");
		const baseGuide = await fs.readFile("guides/open.template.md", "utf-8");
		expect(discord.getResponse("channel1")).to.equal(
			"__Registration now open for **Tournament 1**!__\nThe first tournament\n__Click the ✅ below to sign up!__"
		);
		expect(discord.getResponse("channel2")).to.equal(baseGuide.replace(/{}/g, "tourn1"));
		expect(discord.getEmoji("channel1")).to.equal("✅");
	});
	it("Open tournament - no channels", async function () {
		await expect(tournament.openTournament("smallTournament")).to.be.rejectedWith(UserError);
	});
	it("Cancel tournament", async function () {
		await tournament.finishTournament("tourn2", true);
		// same message as normal finish
		expect(discord.getResponse("channel1")).to.equal(
			"Tournament 2 has concluded! Thank you all for playing! <@&role>\nResults: https://example.com/url"
		);
	});
});

describe("Misc commands", function () {
	it.skip("List players", async function () {
		// const file = await tournament.listPlayers("tourn1");
		// expect(file.filename).to.equal("Tournament 1.csv");
		// TODO: test file contents? sounds scary
	});
	// it("Drop player - choose", async function () {
	// 	await tournament.dropPlayer("tourn1", "player1");
	// 	expect(discord.getResponse("player1")).to.equal("You have successfully dropped from Tournament Tournament 1.");
	// 	expect(discord.getResponse("channel2")).to.equal(
	// 		"Player <@player1> (player1) has chosen to drop from Tournament Tournament 1 (tourn1)."
	// 	);
	// });
	// it("Drop player - force", async function () {
	// 	await tournament.dropPlayer("tourn1", "player1", true);
	// 	expect(discord.getResponse("player1")).to.equal(
	// 		"You have been dropped from Tournament Tournament 1 by the hosts."
	// 	);
	// 	expect(discord.getResponse("channel2")).to.equal(
	// 		"Player <@player1> (player1) has been forcefully dropped from Tournament Tournament 1 (tourn1)."
	// 	);
	// });
	it.skip("Generate pie chart", async function () {
		// const file = await tournament.generatePieChart("tourn1");
		// expect(file.filename).to.equal("Tournament 1 Pie.csv");
		// TODO: test file contents? sounds scary
	});
	it.skip("Generate deck dump", async function () {
		// const file = await tournament.generateDeckDump("tourn1");
		// expect(file.filename).to.equal("Tournament 1 Decks.csv");
		// TODO: test file contents? sounds scary
	});
});
describe("Misc functions", function () {
	it("Register player", async function () {
		await tournament.registerPlayer(
			{
				id: "testMsg",
				content: "React here to sign up",
				author: "testHost",
				channelId: "testChannel",
				serverId: "testServer",
				attachments: [],
				reply: noop,
				react: noop,
				edit: noop
			},
			"stestPlayer1"
		);
		expect(discord.getResponse("stestPlayer1")).to.equal(
			"You are registering for Tournament 1. Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
		);
	});
	it("Register player - blocked DMs", async function () {
		await tournament.registerPlayer(
			{
				id: "testMsg",
				content: "React here to sign up",
				author: "testHost",
				channelId: "testChannel",
				serverId: "testServer",
				attachments: [],
				reply: noop,
				react: noop,
				edit: noop
			},
			"sblockedPlayer"
		);
		expect(discord.getResponse("sblockedPlayer")).to.be.undefined;
		expect(discord.getResponse("channel2")).to.equal(
			"Player <@sblockedPlayer> (sblockedPlayer) is trying to sign up for Tournament Tournament 1 (tourn1), but I cannot send them DMs. Please ask them to allow DMs from this server."
		);
	});
	it("Register player - no tournament", async function () {
		await tournament.registerPlayer(
			{
				id: "wrongMessage",
				content: "React here to sign up",
				author: "testHost",
				channelId: "wrongChannel",
				serverId: "testServer",
				attachments: [],
				reply: noop,
				react: noop,
				edit: noop
			},
			"stestPlayer2"
		);
		expect(discord.getResponse("stestPlayer2")).to.be.undefined;
	});
	it("Clean registration", async function () {
		await expect(
			tournament.cleanRegistration({
				id: "testMsg",
				channelId: "testChannel"
			})
		).to.not.be.rejected;
	});
});
