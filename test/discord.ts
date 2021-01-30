import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DatabaseTournament, TournamentStatus } from "../src/database/interface";
import { DiscordInterface, DiscordMessageIn, splitText } from "../src/discord/interface";
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
	it("mentionChannel", function () {
		expect(discord.mentionChannel("channel")).to.equal("<#channel>");
	});

	it("mentionUser", function () {
		expect(discord.mentionUser("player")).to.equal("<@player>");
	});

	it("mentionRole", function () {
		expect(discord.mentionRole("role")).to.equal("<@&role>");
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

	it("onDelete", async function () {
		// TODO: mock deletion?
		expect(() => discord.onDelete(noop)).to.not.throw;
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
	status: TournamentStatus.PREPARING,
	hosts: ["testHost"],
	players: [],
	server: "testServer",
	publicChannels: [],
	privateChannels: [],
	byes: [],
	findPlayer: () => {
		return { discordId: "testPlayer", challongeId: 1, deck: "" };
	}
};

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
