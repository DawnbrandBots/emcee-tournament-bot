import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { Client } from "eris";
import * as fs from "fs/promises";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { initializeCardArray } from "../src/deck/deck";
import { DiscordAttachmentOut, DiscordEmbed, DiscordInterface, DiscordMessageOut } from "../src/discord/interface";
import { ParticipantRoleProvider } from "../src/role/participant";
import { Templater } from "../src/templates";
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
const participantRole = new ParticipantRoleProvider(new Client("foo"));

sinon.stub(participantRole, "get").resolves("role");
sinon.stub(participantRole, "grant").resolves();
sinon.stub(participantRole, "ungrant").resolves();
sinon.stub(participantRole, "delete").resolves();

const delegate = {
	create: sinon.stub().resolves({
		tournament: undefined,
		isActive: () => true,
		abort: () => undefined
	}),
	loadAll: async () => []
};
const tournament = new TournamentManager(mockDiscord, mockDb, mockWebsite, templater, participantRole, delegate);

before(async () => {
	await initializeCardArray(process.env.OCTOKIT_TOKEN!);
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
	it("Update tournament", async function () {
		await expect(tournament.updateTournament("name", "newName", "newDesc")).to.not.be.rejected;
	});
	it("Add host", async function () {
		await expect(tournament.addHost("name", "testUser")).to.not.be.rejected;
	});
	it("Remove host", async function () {
		await expect(tournament.removeHost("name", "testUser")).to.not.be.rejected;
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
	it("Start tournament", async function () {
		delegate.create.resetHistory();
		await tournament.startTournament("tourn1");
		expect(delegate.create).to.have.been.calledOnce;
	});
	// I have no idea what this test was meant to do
	it.skip("Start tournament - with bye", async function () {
		await tournament.startTournament("byeTournament");
		// no difference in output, but ensures bye-related logic doesn't error
		expect(discord.getResponse("channel1")).to.equal("Time left in the round: `50:00`"); // timer message posted after new round message
	});
	it("Start tournament - pending players", async function () {
		await tournament.startTournament("pendingTournament");
		expect(discord.getResponse("pendingPlayer")).to.equal(
			"Sorry, Tournament Pending tournament has started and you didn't submit a deck, so you have been dropped."
		);
	});
	it("Start tournament - no players", async function () {
		await expect(tournament.startTournament("smallTournament")).to.be.rejectedWith(UserError);
	});
	it("Cancel tournament", async function () {
		await tournament.finishTournament("tourn2", true);
		expect(discord.getResponse("channel1")).to.equal(
			"Tournament 2 has been cancelled. Thank you all for playing! <@&role>\nResults: https://example.com/url"
		);
	});
	// tournament temporarily disabled because unique ID checking + top cut creation logic
	// is too complicated to easily mock with this lazy approach
	// will re-enable this test when tests are reworked with proper stubs
	it.skip("Finish tournament - top cut", async function () {
		await tournament.finishTournament("bigTournament", false);
		expect(discord.getResponse("topChannel")).to.equal("Time left in the round: `50:00`"); // timer message posted after new round message
	});
	it("Next round", async function () {
		delegate.create.resetHistory();
		await tournament.nextRound("tourn2");
		expect(delegate.create).to.have.been.calledOnce; // new round means new timer
	});
});

describe("Misc commands", function () {
	it.skip("List players", async function () {
		// const file = await tournament.listPlayers("tourn1");
		// expect(file.filename).to.equal("Tournament 1.csv");
		// TODO: test file contents? sounds scary
	});
	it("Get player deck", async function () {
		const deck = await tournament.getPlayerDeck("tourn1", "player1");
		expect(deck.url).to.equal(
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
		);
	});
	it("Drop player - choose", async function () {
		await tournament.dropPlayer("tourn1", "player1");
		expect(discord.getResponse("player1")).to.equal("You have successfully dropped from Tournament Tournament 1.");
		expect(discord.getResponse("channel2")).to.equal(
			"Player <@player1> (player1) has chosen to drop from Tournament Tournament 1 (tourn1)."
		);
	});
	it("Drop player - force", async function () {
		await tournament.dropPlayer("tourn1", "player1", true);
		expect(discord.getResponse("player1")).to.equal(
			"You have been dropped from Tournament Tournament 1 by the hosts."
		);
		expect(discord.getResponse("channel2")).to.equal(
			"Player <@player1> (player1) has been forcefully dropped from Tournament Tournament 1 (tourn1)."
		);
	});
	it("Sync tournament", async function () {
		await expect(tournament.syncTournament("tourn1")).to.not.be.rejected;
	});
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
describe("Confirm player", function () {
	// TODO: test attachment version
	it("Normal operation", async function () {
		let file: DiscordAttachmentOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "testUser",
			channelId: "testChannel",
			serverId: "private",
			reply: async (msg, fileIn) => {
				file = fileIn;
			},
			react: noop,
			edit: noop
		});
		const privateFile = discord.getFile("channel2");
		// TODO: save and test the embed sent for the message
		expect(file?.filename).to.equal("testUser.ydk");
		expect(file?.contents).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
		expect(privateFile?.filename).to.equal("testUser.ydk");
		expect(privateFile?.contents).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
	});
	it("non DM", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "testUser",
			channelId: "testChannel",
			serverId: "a server",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		expect(response).to.be.undefined;
	});
	it("Multiple tournaments", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "tooLong",
			channelId: "testChannel",
			serverId: "private",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		const expectedResponse =
			"You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\nTournament 1, Tournament 2";
		const testReponse = (response as string).slice(0, expectedResponse.length);
		expect(testReponse).to.equal(expectedResponse);
	});
	it("No tournaments", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "sNoTournaments",
			channelId: "testChannel",
			serverId: "private",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		expect(response).to.be.undefined;
	});
	it("Illegal deck", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content: "ydke://!!!",
			attachments: [],
			author: "testUser",
			channelId: "testChannel",
			serverId: "private",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		const embed = response as DiscordEmbed;
		expect(embed.fields[1].value).to.equal("Main Deck too small! Should be at least 40, is 0!");
	});
	it("Update deck - too many tournaments", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "sTooMany",
			channelId: "testChannel",
			serverId: "private",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		expect(response).to.equal(
			"You're trying to update your deck for a tournament, but you're in multiple! Please choose one by dropping and registering again.\nTournament 1, Tournament 3"
		);
	});
	it("Update deck", async function () {
		let file: DiscordAttachmentOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content:
				"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!",
			attachments: [],
			author: "sJustRight",
			channelId: "testChannel",
			serverId: "private",
			reply: async (msg, fileIn) => {
				file = fileIn;
			},
			react: noop,
			edit: noop
		});
		const privateFile = discord.getFile("channel2");
		// TODO: save and test the embed sent for the message
		expect(file?.filename).to.equal("sJustRight.ydk");
		expect(file?.contents).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
		expect(privateFile?.filename).to.equal("sJustRight.ydk");
		expect(privateFile?.contents).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
	});
	it("Update deck - illegal deck", async function () {
		let response: DiscordMessageOut | undefined;
		await tournament.confirmPlayer({
			id: "testId",
			content: "ydke://!!!",
			attachments: [],
			author: "sJustRight",
			channelId: "testChannel",
			serverId: "private",
			reply: async msg => {
				response = msg;
			},
			react: noop,
			edit: noop
		});
		const embed = response as DiscordEmbed;
		expect(embed.fields[1].value).to.equal("Main Deck too small! Should be at least 40, is 0!");
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
