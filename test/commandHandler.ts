import { expect } from "chai";
import { DiscordInterface } from "../src/discord/interface";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";

// this will be the centre of the test, simulating input commands to stimulate output
const discord = new DiscordWrapperMock();

const mockDiscord = new DiscordInterface(discord);
const mockTournament = new TournamentMock();

describe.skip("Tournament flow commands", function () {
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
});
