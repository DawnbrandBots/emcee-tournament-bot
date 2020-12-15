import { DiscordCommand, DiscordInterface, DiscordMessageHandler, DiscordMessageIn } from "../src/discord/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import logger from "../src/util/logger";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const discordMock = new DiscordWrapperMock();
const discord = new DiscordInterface(discordMock, "mc!", logger);

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
	it("registerCommand", async function () {
		const command: DiscordCommand = async msg => msg.reply("pong");
		discord.registerCommand("ping", command);
		await discordMock.simMessage("mc!ping", "ping");
		expect(discordMock.getResponse("ping")).to.equal("pong");
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
	it("sendMessage");

	it("deleteMessage");

	it("sendDirectMessage");
});

describe("Roles", function () {
	it("getPlayerRole");

	it("grantPlayerRole");

	it("removePlayerRole");

	it("deletePlayerRole");
});
