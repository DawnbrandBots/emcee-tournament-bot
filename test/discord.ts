import { DiscordInterface, DiscordMessageIn } from "../src/discord/interface";
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
	it("registerCommand");

	it("onMessage");

	it("onDelete");

	it("onPing");

	it("awaitReaction");
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
