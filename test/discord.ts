import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DatabaseTournament } from "../src/database/interface";
import { DiscordInterface, DiscordMessageHandler, DiscordMessageIn, splitText } from "../src/discord/interface";
import { DiscordWrapperMock } from "./mocks/discord";
chai.use(chaiAsPromised);

const discordMock = new DiscordWrapperMock();
const discord = new DiscordInterface(discordMock);

async function noop(): Promise<void> {
	return;
}

const sampleMessage: DiscordMessageIn = {
	id: "testMsg",
	content: "<@player1> <#1101>",
	attachments: [],
	author: "testTO",
	channelId: "testChannel",
	serverId: "testServer",
	reply: noop,
	react: noop,
	edit: noop
};

describe("Simple helpers", function () {
	it("authenticateTO", async function () {
		await expect(discord.authenticateTO(sampleMessage)).to.not.be.rejected;
	});

	it("mentionChannel", function () {
		expect(discord.mentionChannel("channel")).to.equal("<#channel>");
	});

	it("mentionUser", function () {
		expect(discord.mentionUser("player")).to.equal("<@player>");
	});

	it("mentionRole", function () {
		expect(discord.mentionRole("role")).to.equal("<@&role>");
	});

	it("getMentionedUser", function () {
		expect(discord.getMentionedUser(sampleMessage)).to.equal("player1");
	});

	it("getUsername", function () {
		expect(discord.getUsername("player1")).to.equal("player1");
	});

	it("getChannel", function () {
		expect(discord.getChannel(sampleMessage.content)).to.equal("1101");
	});
});

describe("Callback setups", function () {
	it("Ignore non-command message", async function () {
		await discordMock.sendMessage("mc!pong", "pong");
		expect(discordMock.getResponse("pong")).to.be.undefined;
	});

	it("onMessage", async function () {
		const handler: DiscordMessageHandler = async msg => msg.reply("pang");
		discord.onMessage(handler);
		await discordMock.simMessage("not a command", "pang");
		expect(discordMock.getResponse("pang")).to.equal("pang");
	});

	it("onDelete", async function () {
		// TODO: mock deletion?
		expect(() => discord.onDelete(noop)).to.not.throw;
	});

	it("onPing", async function () {
		const handler: DiscordMessageHandler = async msg => msg.reply("peng");
		discord.onPing(handler);
		await discordMock.simPing("peng");
		expect(discordMock.getResponse("peng")).to.equal("peng");
	});

	it("awaitReaction", async function () {
		const msg = await discord.awaitReaction("reactionMessage", "pung", "😳", noop, noop);
		expect(msg.content).to.equal("reactionMessage");
		expect(discordMock.getResponse("pung")).to.equal("reactionMessage");
		expect(discordMock.getEmoji("pung")).to.equal("😳");
		// TODO: mock reactions?
	});
});

describe("Messages", function () {
	it("sendMessage", async function () {
		const msg = await discord.sendMessage("sentChannel", "test message", {
			filename: "file.txt",
			contents: "file contents"
		});
		expect(msg.content).to.equal("test message");
		expect(discordMock.getResponse("sentChannel")).to.equal("test message");
		expect(discordMock.getFile("sentChannel")).to.deep.equal({
			filename: "file.txt",
			contents: "file contents"
		});
	});

	it("deleteMessage", async function () {
		await expect(discord.deleteMessage("delChannel", "delMessage")).to.not.be.rejected;
	});

	it("sendDirectMessage", async function () {
		await discord.sendDirectMessage("sentUser", "test message");
		expect(discordMock.getResponse("sentUser")).to.equal("test message");
	});
});

const sampleTournament: DatabaseTournament = {
	id: "test",
	name: "Test tournament",
	description: "A sample tournament",
	status: "preparing",
	hosts: ["testHost"],
	players: [],
	server: "testServer",
	publicChannels: [],
	privateChannels: [],
	byes: [],
	findHost: () => true,
	findPlayer: () => {
		return { discordId: "testPlayer", challongeId: 1, deck: "" };
	}
};
describe("Roles", function () {
	it("getPlayerRole", async function () {
		const role = await discord.getPlayerRole(sampleTournament);
		expect(role).to.equal("role");
	});

	it("grantPlayerRole", async function () {
		await expect(discord.grantPlayerRole("testPlayer", "role")).to.not.be.rejected;
	});

	it("removePlayerRole", async function () {
		await expect(discord.removePlayerRole("testPlayer", "role")).to.not.be.rejected;
	});

	it("deletePlayerRole", async function () {
		await expect(discord.deletePlayerRole(sampleTournament)).to.not.be.rejected;
	});
});

describe("Split text", function () {
	it("Split on new line", function () {
		const text = `aaaaaaaa\n${"a".repeat(2048)}`;
		const split = splitText(text, 2000);
		expect(split[0]).to.equal("aaaaaaaa\n");
	});
	it("Split on new sentence", function () {
		const text = `aaaaaaaa.${"a".repeat(2048)}`;
		const split = splitText(text, 2000);
		expect(split[0]).to.equal("aaaaaaaa.");
	});
	it("Split on new word", function () {
		const text = `aaaaaaaa ${"a".repeat(2048)}`;
		const split = splitText(text); // test default cap
		expect(split[0]).to.equal("aaaaaaaa ");
	});
	it("Split on at absolute limit", function () {
		const text = "a".repeat(2048);
		const split = splitText(text, 2000);
		expect(split[1].length).to.equal(48);
	});
});
