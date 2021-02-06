import { expect } from "chai";
import { DiscordInterface } from "../src/discord/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";

// this will be the centre of the test, simulating input commands to stimulate output
const discord = new DiscordWrapperMock();

const mockDiscord = new DiscordInterface(discord);
const mockTournament = new TournamentMock();

describe.skip("Tournament creation commands", function () {
	it("Create tournament", async function () {
		await discord.simMessage("mc!create name|desc", "create");
		const response = discord.getResponse("create");
		// guide message sent after creation response
		expect(response).to.equal("Guide: mc!help name");
	});
	it("Update tournament", async function () {
		await discord.simMessage("mc!update name|newName|newDesc", "update");
		const response = discord.getResponse("update");
		expect(response).to.equal("Tournament `name` updated! It now has the name newName and the given description.");
	});
	it("Add channel - private", async function () {
		await discord.simMessage("mc!addchannel name|private", "addchannel2");
		expect(discord.getResponse("addchannel2")).to.equal(
			`This channel added as a private announcement channel for Tournament name!`
		);
	});
	it("Add channel - unspecified type", async function () {
		await discord.simMessage("mc!addchannel name", "addchannel3");
		expect(discord.getResponse("addchannel3")).to.equal(
			`This channel added as a public announcement channel for Tournament name!`
		);
	});
	it("Remove channel - private/default", async function () {
		await discord.simMessage("mc!removechannel name|private", "remchannel2");
		expect(discord.getResponse("remchannel2")).to.equal(
			`This channel removed as a private announcement channel for Tournament name!`
		);
	});
	it("Remove channel - unspecified type", async function () {
		await discord.simMessage("mc!removechannel name", "remchannel3");
		expect(discord.getResponse("remchannel3")).to.equal(
			`This channel removed as a public announcement channel for Tournament name!`
		);
	});
	it("Add host", async function () {
		await discord.simMessage("mc!addhost name|<@1101>", "addhost");
		expect(discord.getResponse("addhost")).to.equal(
			`${mockDiscord.mentionUser("1101")} added as a host for Tournament name!`
		);
	});
	it("Remove host", async function () {
		await discord.simMessage("mc!removehost name|<@1101>", "remhost");
		expect(discord.getResponse("remhost")).to.equal(
			`${mockDiscord.mentionUser("1101")} removed as a host for Tournament name!`
		);
	});
});
describe.skip("Tournament flow commands", function () {
	it("Open tournament", async function () {
		await discord.simMessage("mc!open name", "open");
		expect(discord.getResponse("open")).to.equal("Tournament name opened for registration!");
	});
	it("Start tournament", async function () {
		await discord.simMessage("mc!start name", "start");
		expect(discord.getResponse("start")).to.equal("Tournament name successfully commenced!");
	});
	it("Cancel tournament", async function () {
		await discord.simMessage("mc!cancel name", "cancel");
		expect(discord.getResponse("cancel")).to.equal("Tournament name successfully canceled.");
	});
	it("Submit score - good input", async function () {
		await discord.simMessage("mc!score name|2-1", "score");
		expect(discord.getResponse("score")).to.equal("For more detail, test the tournament handler!");
	});
	it("Submit score - bad input", async function () {
		await discord.simMessage("mc!score name|i won", "score2");
		expect(discord.getResponse("score2")).to.equal("Must provide score in format `#-#` e.g. `2-1`.");
	});
	it("Submit score - by host", async function () {
		await discord.simMessage("mc!forcescore name|2-1|<@player1>", "forcescore");
		expect(discord.getResponse("forcescore")).to.equal("For more detail, test the tournament handler!");
	});
	it("Submit score - by host bad input", async function () {
		await discord.simMessage("mc!forcescore name|john won|<@john>", "forcescore2");
		expect(discord.getResponse("forcescore2")).to.equal("Must provide score in format `#-#` e.g. `2-1`.");
	});
	it("Next round", async function () {
		await discord.simMessage("mc!round name", "round1");
		expect(discord.getResponse("round1")).to.equal("New round successfully started for Tournament name.");
	});
});
describe.skip("Misc tournament commands", function () {
	it("List players", async function () {
		await discord.simMessage("mc!players name", "players");
		expect(discord.getResponse("players")).to.equal(
			"A list of players for tournament name with the theme of their deck is attached."
		);
		expect(discord.getFile("players")).to.deep.equal({
			filename: "name.csv",
			contents: "name"
		});
	});
	it("Drop self", async function () {
		await discord.simMessage("mc!drop name", "drop");
		expect(discord.getResponse("drop")).to.equal(
			"Player testUser, you have successfully dropped from Tournament name."
		);
	});
	it("Drop player", async function () {
		await discord.simMessage("mc!forcedrop name|<@1101>", "forcedrop");
		expect(discord.getResponse("forcedrop")).to.equal("Player 1101 successfully dropped from Tournament name.");
	});
	it("Sync", async function () {
		await discord.simMessage("mc!sync name", "sync");
		expect(discord.getResponse("sync")).to.equal(
			"Tournament name database successfully synchronised with remote website."
		);
	});
	it("Pie chart", async function () {
		await discord.simMessage("mc!pie name", "pie");
		expect(discord.getResponse("pie")).to.equal("Archetype counts for Tournament name are attached.");
		expect(discord.getFile("players")).to.deep.equal({
			filename: "name.csv",
			contents: "name"
		});
	});
	it("Get player deck", async function () {
		await discord.simMessage("mc!deck name|<@1101>", "deck");
		// TODO: test embed fields :(
		// ABC test deck from YDeck test suites
		expect(discord.getFile("deck")).to.deep.equal({
			filename: "1101.ydk",
			contents:
				"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		});
	});
	it("Register bye", async function () {
		await discord.simMessage("mc!addbye name|<@player1>", "bye");
		expect(discord.getResponse("bye")).to.equal(
			"Bye registered for Player <@player1> (player1) in Tournament name!\nAll byes: <@bye1> (bye1)"
		);
	});
	it("Remove bye", async function () {
		await discord.simMessage("mc!removebye name|<@player1>", "rbye");
		expect(discord.getResponse("rbye")).to.equal(
			"Bye removed for Player <@player1> (player1) in Tournament name!\nAll byes: <@bye1> (bye1)"
		);
	});
});
