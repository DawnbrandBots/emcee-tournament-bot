import { DiscordAttachmentOut, DiscordInterface, DiscordMessageOut } from "../src/discord/interface";
import logger from "../src/util/logger";
import { TournamentManager } from "../src/TournamentManager";
import { WebsiteInterface } from "../src/website/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import { WebsiteWrapperMock } from "./mocks/website";
import { DatabaseWrapperMock } from "./mocks/database";
import { DatabaseInterface } from "../src/database/interface";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { TimerInterface } from "../src/timer/interface";

chai.use(chaiAsPromised);

const discord = new DiscordWrapperMock(); // will be used to fetch responses in some cases
const mockDiscord = new DiscordInterface(discord, "mc!", logger);

const mockDbWrapper = new DatabaseWrapperMock();
const mockDb = new DatabaseInterface(mockDbWrapper);

const mockWebsiteWrapper = new WebsiteWrapperMock();
const mockWebsite = new WebsiteInterface(mockWebsiteWrapper);

const mockTimer = TimerInterface;

const tournament = new TournamentManager(mockDiscord, mockDb, mockWebsite, logger, mockTimer);

async function noop(): Promise<void> {
	return;
}

describe("Tournament creation commands", async function () {
	it("Create tournament", async function () {
		const [id, url] = await tournament.createTournament("testUser", "testServer", "name", "desc");
		expect(id).to.equal("mc_name");
		expect(url).to.equal("https://example.com/mc_name");
	});
	it("Update tournament", async function () {
		await expect(tournament.updateTournament("mc_name", "newName", "newDesc")).to.not.be.rejected;
	});
	it("Add announcement channel", async function () {
		await expect(tournament.addAnnouncementChannel("mc_name", "testChannel", "public")).to.not.be.rejected;
	});
	it("Remove announcement channel", async function () {
		await expect(tournament.removeAnnouncementChannel("mc_name", "testChannel", "public")).to.not.be.rejected;
	});
	it("Add host", async function () {
		await expect(tournament.addHost("mc_name", "testUser")).to.not.be.rejected;
	});
	it("Remove host", async function () {
		await expect(tournament.removeHost("mc_name", "testUser")).to.not.be.rejected;
	});
});

describe("Tournament flow commands", function () {
	it("Open tournament", async function () {
		await tournament.openTournament("tourn1");
		expect(discord.getResponse("channel1")).to.equal(
			"__Registration now open for **Tournament 1**!__\nThe first tournament\n__Click the ✅ below to sign up!__"
		);
		expect(discord.getEmoji("channel1")).to.equal("✅");
	});
	it("Start tournament", async function () {
		await tournament.startTournament("tourn1");
		expect(discord.getResponse("channel1")).to.equal("Time left in the round: `50:00`"); // timer message posted after new round message
	});
	it("Cancel tournament", async function () {
		await tournament.cancelTournament("tourn1");
		expect(discord.getResponse("channel1")).to.equal(
			"Tournament 1 has been cancelled. Thank you all for playing! <@&role>\nResults: https://example.com/url"
		);
	});
	it("Submit score", async function () {
		const response1 = await tournament.submitScore("tourn1", "player1", 2, 1);
		expect(response1).to.equal(
			"You have reported a score of 2-1, <@player1>. Your opponent still needs to confirm this score."
		);
		const response2 = await tournament.submitScore("tourn1", "player1", 2, 1);
		expect(response2).to.equal(
			`You have already reported your score for this match, <@player1>. Please have your opponent confirm the score.`
		);
		const response3 = await tournament.submitScore("tourn1", "player2", 2, 1);
		expect(response3).to.equal(
			"Your score does not match your opponent's reported score of 1-2. Both you and they will need to report again, <@player2>."
		);
		const response4 = await tournament.submitScore("tourn1", "player2", 2, 1);
		expect(response4).to.equal(
			"You have reported a score of 2-1, <@player2>. Your opponent still needs to confirm this score."
		);
		const response5 = await tournament.submitScore("tourn1", "player1", 1, 2);
		expect(response5).to.equal(
			"You have successfully reported a score of 1-2, and it matches your opponent's report, so the score has been saved. Thank you, <@player1>."
		);
	});
	it("Submit score - host", async function () {
		const response = await tournament.submitScore("tourn1", "player1", 2, 1, true);
		expect(response).to.equal("");
	});
	it("Next round", async function () {
		const round = await tournament.nextRound("tourn1");
		expect(round).to.equal(2);
		expect(discord.getResponse("channel1")).to.equal("Time left in the round: `50:00`"); // new round means new timer
	});
});

describe("Misc commands", function () {
	it("List tournaments", async function () {
		const list = await tournament.listTournaments();
		expect(list).to.equal(
			"ID: tourn1|Name: Tournament 1|Status: preparing|Players: 4\nID: tourn2|Name: Tournament 2|Status: preparing|Players: 3"
		);
	});
	it("List players", async function () {
		const file = await tournament.listPlayers("tourn1");
		expect(file.filename).to.equal("Tournament 1.csv");
		// TODO: test file contents? sounds scary
	});
	it("Get player deck", async function () {
		const deck = await tournament.getPlayerDeck("tourn1", "player1");
		expect(deck.url).to.equal(
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
		);
	});
	it("Drop player", async function () {
		await tournament.dropPlayer("tourn1", "player1");
		expect(discord.getResponse("player1")).to.equal("You have dropped from Tournament Tournament 1 by the hosts.");
		expect(discord.getResponse("channel2")).to.equal(
			"Player <@player1> (player1) forcefully dropped from Tournament Tournament 1 (tourn1)."
		);
	});
	it("Sync tournament", async function () {
		await expect(tournament.syncTournament("tourn1")).to.not.be.rejected;
	});
	it("Generate pie chart", async function () {
		const file = await tournament.generatePieChart("tourn1");
		expect(file.filename).to.equal("Tournament 1.csv");
		// TODO: test file contents? sounds scary
	});
	it("Register bye", async function () {
		const byes = await tournament.registerBye("tourn1", "bye1");
		expect(byes).to.deep.equal(["player1"]);
	});
	it("Remove bye", async function () {
		const byes = await tournament.removeBye("tourn1", "bye1");
		expect(byes).to.deep.equal(["player1"]);
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
		expect(response).to.equal(
			"You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\nTournament 1, Tournament 2"
		);
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
			"You're trying to update your deck for a tournament, but you're in multiple! Please choose one by dropping and registering again.\nTournament 1, Tournament 2"
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
	it("Authenticate host", async function () {
		await expect(tournament.authenticateHost("tourn1", "testUser")).to.not.be.rejected;
	});
	it("Authenticate player", async function () {
		await expect(tournament.authenticatePlayer("tourn1", "player1")).to.not.be.rejected;
	});
});