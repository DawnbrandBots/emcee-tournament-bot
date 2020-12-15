import chai, { expect } from "chai";
import { getDeckFromMessage, prettyPrint } from "../src/deck/discordDeck";
import { DiscordEmbed, DiscordMessageIn } from "../src/discord/interface";
import { DeckNotFoundError } from "../src/util/errors";
import chaiAsPromised from "chai-as-promised";
import { getDeck } from "../src/deck/deck";
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

describe("Test embeds", function () {
	it("Standard ABC test deck", async function () {
		const deck = await getDeck(
			"ydke://5m3qBeZt6gV9+McCffjHAn34xwK8beUDvG3lA7xt5QMfX5ICWvTJAVr0yQFa9MkBrDOdBKwznQSsM50Ey/UzAMv1MwDL9TMAdAxQBQ6wYAKvI94AryPeAK8j3gCmm/QBWXtjBOMavwDjGr8A4xq/AD6kcQGeE8oEnhPKBJ4TygSlLfUDpS31A6Ut9QMiSJkAIkiZACJImQCANVMDgDVTAw==!FtIXALVcnwC1XJ8AiBF2A4gRdgNLTV4Elt0IAMf4TQHCT0EAvw5JAqSaKwD5UX8EweoDA2LO9ATaI+sD!H1+SAg==!"
		);
		const [out, file] = prettyPrint(deck, "abc.ydk");
		const embed = out as DiscordEmbed;
		expect(file.filename).to.equal("abc.ydk");
		expect(file.contents).to.equal(
			"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		);
		expect(embed.title).to.equal("Contents of your deck:\n");
		const mainField = embed.fields[0];
		expect(mainField.name).to.equal("Main Deck (40 cards - 25 Monsters, 12 Spells, 3 Traps)");
		expect(mainField.value).to.equal(
			"2 Union Driver\n3 Galaxy Soldier\n3 Photon Thrasher\n1 Photon Vanisher\n3 A-Assault Core\n3 B-Buster Drake\n3 C-Crush Wyvern\n1 Photon Orbital\n1 Heavy Mech Support Armor\n3 Ash Blossom & Joyous Spring\n1 Reinforcement of the Army\n1 Terraforming\n3 Unauthorized Reactivation\n1 Called by the Grave\n3 Magnet Reverse\n3 Union Hangar\n3 Infinite Impermanence\n2 Morinphen"
		);
		const extraField = embed.fields[1];
		expect(extraField.name).to.equal("Extra Deck (15 cards - 1 Fusion, 6 Xyz, 8 Link)");
		expect(extraField.value).to.equal(
			"1 ABC-Dragon Buster\n2 Cyber Dragon Infinity\n2 Cyber Dragon Nova\n1 Bujintei Tsukuyomi\n1 Daigusto Emeral\n1 Mekk-Knight Crusadia Avramax\n1 Apollousa, Bow of the Goddess\n1 Knightmare Unicorn\n1 Knightmare Phoenix\n1 Knightmare Cerberus\n1 Crystron Halqifibrax\n1 Union Carrier\n1 I:P Masquerena"
		);
		const sideField = embed.fields[2];
		expect(sideField.name).to.equal("Side Deck (1 cards - 1 Monsters)");
		expect(sideField.value).to.equal("1 Photon Vanisher");
	});
	it("Deck with archetypes");
	it("Deck with errors");
});
