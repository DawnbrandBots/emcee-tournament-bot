import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import { DeckManager, initializeDeckManager, splitText } from "../src/deck";
chai.use(chaiAsPromised);

// This is created so we can stub out methods. Most Eris objects also need this as a constructor parameter.
const mockBotClient = new Client("mock");
// For the purposes of most commands, most fields don't matter. This is the minimum to make the constructor run.
export const sampleMessage = new Message(
	{ id: "testMessage", channel_id: "testChannel", author: { id: "testUser" }, attachments: [] },
	mockBotClient
);

let decks: DeckManager;

before(async () => {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	decks = await initializeDeckManager(process.env.OCTOKIT_TOKEN!);
});

describe("Get deck from message", function () {
	it("URL", async function () {
		sampleMessage.content =
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!";
		const deck = await decks.getDeckFromMessage(sampleMessage);
		sampleMessage.content = "";
		expect(deck?.mainSize).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("YDK", async function () {
		sampleMessage.attachments = [
			{
				filename: "deck.ydk",
				url:
					"https://raw.githubusercontent.com/AlphaKretin/AlphaKretin.github.io/297c9154cf29214b65bebdd9a85acbdf68fb5eb0/miscstorage/ABC.ydk",
				id: "unused",
				proxy_url: "unused",
				size: NaN
			}
		];
		const deck = await decks.getDeckFromMessage(sampleMessage);
		sampleMessage.attachments = [];
		expect(deck?.mainSize).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("None", function () {
		expect(decks.getDeckFromMessage(sampleMessage)).to.be.rejectedWith(
			"Invalid input to Deck constructor: Could not parse a YDKE URL."
		);
	});
});

describe("Test embeds", function () {
	it("Standard ABC test deck", async function () {
		const deck = decks.getDeck(
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
		);
		const [{ embed }, { name, file }] = decks.prettyPrint(deck, "abc.ydk");
		expect(name).to.equal("abc.ydk");
		expect(file).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
		expect(embed?.title).to.equal("Contents of your deck:\n");
		const mainField = embed?.fields?.[0];
		expect(mainField?.name).to.equal("Main Deck (40 cards - 25 Monsters, 12 Spells, 3 Traps)");
		expect(mainField?.value).to.equal(
			"2 Union Driver\n3 Galaxy Soldier\n3 Photon Thrasher\n1 Photon Vanisher\n3 A-Assault Core\n3 B-Buster Drake\n3 C-Crush Wyvern\n1 Photon Orbital\n1 Heavy Mech Support Armor\n3 Ash Blossom & Joyous Spring\n1 Reinforcement of the Army\n1 Terraforming\n3 Unauthorized Reactivation\n1 Called by the Grave\n3 Magnet Reverse\n3 Union Hangar\n3 Infinite Impermanence\n2 Morinphen"
		);
		const extraField = embed?.fields?.[1];
		expect(extraField?.name).to.equal("Extra Deck (15 cards - 1 Fusion, 6 Xyz, 8 Link)");
		expect(extraField?.value).to.equal(
			"1 ABC-Dragon Buster\n2 Cyber Dragon Infinity\n2 Cyber Dragon Nova\n1 Bujintei Tsukuyomi\n1 Daigusto Emeral\n1 Mekk-Knight Crusadia Avramax\n1 Apollousa, Bow of the Goddess\n1 Knightmare Unicorn\n1 Knightmare Phoenix\n1 Knightmare Cerberus\n1 Crystron Halqifibrax\n1 Union Carrier\n1 I:P Masquerena"
		);
		const sideField = embed?.fields?.[2];
		expect(sideField?.name).to.equal("Side Deck (1 cards - 1 Monsters)");
		expect(sideField?.value).to.equal("1 Photon Vanisher");
		const ydkeField = embed?.fields?.[3];
		expect(ydkeField?.name).to.equal("YDKE URL");
		expect(ydkeField?.value).to.equal(
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
		);
	});
	it("Empty deck", async function () {
		const deck = decks.getDeck("ydke://!!!");
		const [{ embed }, { name, file }] = decks.prettyPrint(deck, "blank.ydk");
		expect(name).to.equal("blank.ydk");
		expect(file).to.equal("#created by YDeck\n#main\n#extra\n!side\n");
		expect(embed?.title).to.equal("Contents of your deck:\n");
		const errorField = embed?.fields?.[1];
		expect(errorField?.name).to.equal("Deck is illegal!");
		expect(errorField?.value).to.equal("Main Deck too small! Should be at least 40, is 0!");
	});
	it("Deck with archetypes");
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
