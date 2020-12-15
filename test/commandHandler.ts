import chai, { expect } from "chai";
import { CommandHandler } from "../src/CommandHandler";
import { DiscordInterface } from "../src/discord/interface";
import logger from "../src/logger";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
// this will be the centre of the test, simulating input commands to stimulate output
const discord = new DiscordWrapperMock();

const mockDiscord = new DiscordInterface(discord, "mc!", logger);
const mockTournament = new TournamentMock();

new CommandHandler(mockDiscord, mockTournament, logger);

describe("Basic test", function () {
	it("Help", async function () {
		await discord.simMessage("mc!help", "help");
		const response = discord.getResponse("help");
		expect(response).to.equal(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	});
	it("Ping help", async function () {
		await discord.simPing("ping");
		const response = discord.getResponse("ping");
		expect(response).to.equal(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	});
	it("Argument validation", async function () {
		await discord.simMessage("mc!create", "error");
		const response = discord.getResponse("error");
		expect(response).to.equal("Missing parameter number 0!");
	});
});
describe("Tournament creation commands", function () {
	it("Create tournament", async function () {
		await discord.simMessage("mc!create name|desc", "create");
		const response = discord.getResponse("create");
		expect(response).to.equal(
			"Tournament name created! You can find it at https://example.com/name. For future commands, refer to this tournament by the id `mc_name`."
		);
	});
	it("Update tournament", async function () {
		await discord.simMessage("mc!update mc_name|newName|newDesc", "update");
		const response = discord.getResponse("update");
		expect(response).to.equal(
			"Tournament `mc_name` updated! It now has the name newName and the given description."
		);
	});
	it("Add channel - public/specific", async function () {
		// channel mentions must be digits
		await discord.simMessage("mc!addchannel mc_name|public|<#1101>", "addchannel");
		expect(discord.getResponse("1101")).to.equal(
			"This channel added as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("addchannel")).to.equal(
			`${mockDiscord.mentionChannel("1101")} added as a public announcement channel for Tournament mc_name!`
		);
	});
	it("Add channel - private/default", async function () {
		await discord.simMessage("mc!addchannel mc_name|private", "addchannel2");
		expect(discord.getResponse("testChannel")).to.equal(
			"This channel added as a private announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("addchannel2")).to.equal(
			`${mockDiscord.mentionChannel(
				"testChannel"
			)} added as a private announcement channel for Tournament mc_name!`
		);
	});
	it("Add channel - unspecified type", async function () {
		await discord.simMessage("mc!addchannel mc_name", "addchannel3");
		expect(discord.getResponse("testChannel")).to.equal(
			"This channel added as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("addchannel3")).to.equal(
			`${mockDiscord.mentionChannel(
				"testChannel"
			)} added as a public announcement channel for Tournament mc_name!`
		);
	});
	it("Remove channel - public/specified", async function () {
		await discord.simMessage("mc!removechannel mc_name|public|<#1102>", "remchannel");
		expect(discord.getResponse("1102")).to.equal(
			"This channel removed as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("remchannel")).to.equal(
			`${mockDiscord.mentionChannel("1102")} removed as a public announcement channel for Tournament mc_name!`
		);
	});
	it("Remove channel - private/default", async function () {
		await discord.simMessage("mc!removechannel mc_name|private", "remchannel2");
		expect(discord.getResponse("testChannel")).to.equal(
			"This channel removed as a private announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("remchannel2")).to.equal(
			`${mockDiscord.mentionChannel(
				"testChannel"
			)} removed as a private announcement channel for Tournament mc_name!`
		);
	});
	it("Remove channel - unspecified type", async function () {
		await discord.simMessage("mc!removechannel mc_name", "remchannel3");
		expect(discord.getResponse("testChannel")).to.equal(
			"This channel removed as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("remchannel3")).to.equal(
			`${mockDiscord.mentionChannel(
				"testChannel"
			)} removed as a public announcement channel for Tournament mc_name!`
		);
	});
	it("Add host", async function () {
		await discord.simMessage("mc!addhost mc_name|<@1101>", "addhost");
		expect(discord.getResponse("addhost")).to.equal(
			`${mockDiscord.mentionUser("1101")} added as a host for Tournament mc_name!`
		);
	});
	it("Remove host", async function () {
		await discord.simMessage("mc!removehost mc_name|<@1101>", "remhost");
		expect(discord.getResponse("remhost")).to.equal(
			`${mockDiscord.mentionUser("1101")} removed as a host for Tournament mc_name!`
		);
	});
});
describe("Tournament flow commands", function () {
	it("Open tournament", async function () {
		await discord.simMessage("mc!open mc_name", "open");
		expect(discord.getResponse("open")).to.equal("Tournament mc_name opened for registration!");
	});
	it("Start tournament", async function () {
		await discord.simMessage("mc!start mc_name", "start");
		expect(discord.getResponse("start")).to.equal("Tournament mc_name successfully commenced!");
	});
	it("Cancel tournament", async function () {
		await discord.simMessage("mc!cancel mc_name", "cancel");
		expect(discord.getResponse("cancel")).to.equal("Tournament mc_name successfully canceled.");
	});
	it("Submit score - good input", async function () {
		await discord.simMessage("mc!score mc_name|2-1", "score");
		expect(discord.getResponse("score")).to.equal("For more detail, test the tournament handler!");
	});
	it("Submit score - bad input", async function () {
		await discord.simMessage("mc!score mc_name|i won", "score2");
		expect(discord.getResponse("score2")).to.equal("Must provide score in format `#-#` e.g. `2-1`.");
	});
	it("Submit score - by host", async function () {
		await discord.simMessage("mc!forcescore mc_name|2-1|<@player1>", "forcescore");
		expect(discord.getResponse("forcescore")).to.equal(
			"Score of 2-1 submitted in favour of <@player1> (player1) in Tournament mc_name!"
		);
	});
	it("Next round - normal", async function () {
		await discord.simMessage("mc!round mc_name", "round1");
		expect(discord.getResponse("round1")).to.equal("Tournament mc_name successfully progressed to round 2.");
	});
	it("Next round - final", async function () {
		await discord.simMessage("mc!round mc_final", "round2");
		expect(discord.getResponse("round2")).to.equal(
			"Tournament mc_final successfully progressed past final round and completed."
		);
	});
});
describe("Misc tournament commands", function () {
	it("List tournaments", async function () {
		await discord.simMessage("mc!list", "list");
		expect(discord.getResponse("list")).to.equal("```\nThis sure is a list.```");
	});
	it("List players", async function () {
		await discord.simMessage("mc!players mc_name", "players");
		expect(discord.getResponse("players")).to.equal(
			"A list of players for tournament mc_name with the theme of their deck is attached."
		);
		expect(discord.getFile("players")).to.deep.equal({
			filename: "mc_name.csv",
			contents: "mc_name"
		});
	});
	it("Drop self", async function () {
		await discord.simMessage("mc!drop mc_name", "drop");
		expect(discord.getResponse("drop")).to.equal(
			"Player testUser, you have successfully dropped from Tournament mc_name."
		);
	});
	it("Drop player", async function () {
		await discord.simMessage("mc!forcedrop mc_name|<@1101>", "forcedrop");
		expect(discord.getResponse("forcedrop")).to.equal("Player 1101 successfully dropped from Tournament mc_name.");
	});
	it("Sync", async function () {
		await discord.simMessage("mc!sync mc_name", "sync");
		expect(discord.getResponse("sync")).to.equal(
			"Tournament mc_name database successfully synchronised with remote website."
		);
	});
	it("Pie chart", async function () {
		await discord.simMessage("mc!pie mc_name", "pie");
		expect(discord.getResponse("pie")).to.equal("Archetype counts for Tournament mc_name are attached.");
		expect(discord.getFile("players")).to.deep.equal({
			filename: "mc_name.csv",
			contents: "mc_name"
		});
	});
	it("Get player deck", async function () {
		await discord.simMessage("mc!deck mc_name|<@1101>", "deck");
		// TODO: test embed fields :(
		// ABC test deck from YDeck test suites
		expect(discord.getFile("deck")).to.deep.equal({
			filename: "1101.ydk",
			contents:
				"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
		});
	});
});
