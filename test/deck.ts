import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, FileOptions, Message, MessageAttachment } from "discord.js";
import { DeckManager, initializeDeckManager, splitText } from "../src/deck";
chai.use(chaiAsPromised);

// This is created so we can stub out methods. Most DJS objects also need this as a constructor parameter.
const mockBotClient = new Client({ intents: [] });
// For the purposes of most commands, most fields don't matter. This is the minimum to make the constructor run.
export const sampleMessage = Reflect.construct(Message, [
	mockBotClient,
	{
		id: "007",
		channel_id: "foo",
		author: { id: "0000", username: "K", discriminator: "1234", avatar: "k.png" },
		content: ".",
		timestamp: "1",
		edited_timestamp: "1",
		tts: false,
		mention_everyone: false,
		mentions: [],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: 0
	}
]);

let decks: DeckManager;

before(async () => {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	decks = await initializeDeckManager(process.env.OCTOKIT_TOKEN!);
});

const sampleDeck =
	"ydke://o6lXBaOpVwWjqVcFep21BXqdtQV6nbUF8GFdAvBhXQLwYV0CLdjxAS3Y8QEt2PEBiWdgA4lnYAOJZ2AD0hVTAtIVUwLSFVMC9slUAvbJVAL2yVQCKYF+BSmBfgUpgX4FYW7uA2Fu7gNhbu4DlDaLBJQ2iwSUNosE0GpSAtBqUgLQalICTIHIAEyByABMgcgAXu5QBV7uUAVe7lAFsdjfAQ==!yV+/A8lfvwPJX78D!sdjfAbHY3wE=!";

describe("Get deck from message", function () {
	it("URL", async function () {
		sampleMessage.content = sampleDeck;
		const [deck] = await decks.getDeckFromMessage(sampleMessage);
		sampleMessage.content = "";
		expect(deck.contents.main.length).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("YDK", async function () {
		sampleMessage.attachments.set(
			"unused",
			new MessageAttachment("unused", "deck.ydk", {
				url: "https://raw.githubusercontent.com/AlphaKretin/AlphaKretin.github.io/297c9154cf29214b65bebdd9a85acbdf68fb5eb0/miscstorage/ABC.ydk",
				filename: "deck.ydk",
				id: "unused",
				proxy_url: "unused",
				size: NaN
			})
		);
		const [deck] = await decks.getDeckFromMessage(sampleMessage);
		sampleMessage.attachments.clear();
		expect(deck.contents.main.length).to.equal(40); // more details in ydeck tests, just checking we got something
	});
	it("None", function () {
		expect(decks.getDeckFromMessage(sampleMessage)).to.be.rejectedWith(
			"Invalid input to Deck constructor: Could not parse a YDKE URL."
		);
	});
});

describe("Test embeds", function () {
	it("Standard test deck", async function () {
		const deck = decks.getDeck(sampleDeck);
		const messageContent = decks.prettyPrint(deck, "test.ydk");
		const file = messageContent?.files?.[0] as FileOptions;
		expect(file.name).to.equal("test.ydk");
		expect(file.attachment.toString()).to.equal(
			"#created by YDeck\n#main\n89631139\n89631139\n89631139\n95788410\n95788410\n95788410\n39674352\n39674352\n39674352\n32626733\n32626733\n32626733\n56649609\n56649609\n56649609\n38999506\n38999506\n38999506\n39111158\n39111158\n39111158\n92176681\n92176681\n92176681\n65957473\n65957473\n65957473\n76232340\n76232340\n76232340\n38955728\n38955728\n38955728\n13140300\n13140300\n13140300\n89189982\n89189982\n89189982\n31447217\n#extra\n62873545\n62873545\n62873545\n!side\n31447217\n31447217\n"
		);
		const embed = messageContent?.embeds?.[0];
		expect(embed?.title).to.equal("Themes: none");
		const mainField = embed?.fields?.[0];
		expect(mainField?.name).to.equal("Main Deck (40 cards — 40 Monsters)");
		expect(mainField?.value).to.equal(
			"3 Blue-Eyes White Dragon\n3 Rabidragon\n3 Gogiga Gagagigo\n3 Spiral Serpent\n3 Phantasm Spiral Dragon\n3 Cosmo Queen\n3 Tri-Horned Dragon\n3 Suppression Collider\n3 Metal Armored Bug\n3 Sengenjin\n3 Dragon Core Hexer\n3 Hieratic Seal of the Sun Dragon Overlord\n3 Metaphys Armed Dragon\n1 Wingweaver"
		);
		const extraField = embed?.fields?.[1];
		expect(extraField?.name).to.equal("Extra Deck (3 cards — 3 Fusion)");
		expect(extraField?.value).to.equal("3 Dragon Master Knight");
		const sideField = embed?.fields?.[2];
		expect(sideField?.name).to.equal("Side Deck (2 cards — 2 Monsters)");
		expect(sideField?.value).to.equal("2 Wingweaver");
		const ydkeField = embed?.fields?.[3];
		expect(ydkeField?.name).to.equal("YDKE URL");
		expect(ydkeField?.value).to.equal(sampleDeck);
	});
	it("Empty deck", async function () {
		const deck = decks.getDeck("ydke://!!!");
		const messageContent = decks.prettyPrint(deck, "blank.ydk", [
			{ type: "size", target: "main", min: 40, max: 60, actual: 0 }
		]);
		const file = messageContent?.files?.[0] as FileOptions;
		expect(file.name).to.equal("blank.ydk");
		expect(file.attachment.toString()).to.equal("#created by YDeck\n#main\n#extra\n!side\n");
		const embed = messageContent?.embeds?.[0];
		expect(embed?.title).to.equal("Themes: none");
		const errorField = embed?.fields?.[1];
		expect(errorField?.name).to.equal("Deck is illegal! (1)");
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
