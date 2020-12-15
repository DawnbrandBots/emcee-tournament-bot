import chai, { expect } from "chai";
import { getDeckFromMessage } from "../src/deck/discordDeck";
import { DiscordMessageIn } from "../src/discord/interface";
import { DeckNotFoundError } from "../src/util/errors";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

async function noop(): Promise<void> {
	return;
}

const sampleMessage: DiscordMessageIn = {
	id: "testMessage",
	content: "",
	attachments: [],
	author: "testUser",
	channelId: "testChannel",
	serverId: "testServer",
	react: noop,
	reply: noop,
	edit: noop
};

describe("Get deck from message", function () {
	it("URL", async function () {
		sampleMessage.content =
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!";
		const deck = await getDeckFromMessage(sampleMessage);
		sampleMessage.content = "";
		expect(deck.mainSize).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("YDK", async function () {
		sampleMessage.attachments = [
			{
				filename: "deck.ydk",
				url:
					"https://raw.githubusercontent.com/AlphaKretin/AlphaKretin.github.io/297c9154cf29214b65bebdd9a85acbdf68fb5eb0/miscstorage/ABC.ydk"
			}
		];
		const deck = await getDeckFromMessage(sampleMessage);
		sampleMessage.attachments = [];
		expect(deck.mainSize).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("None", async function () {
		await expect(getDeckFromMessage(sampleMessage)).to.be.rejectedWith(DeckNotFoundError);
	});
});
