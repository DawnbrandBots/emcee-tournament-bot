import { expect } from "chai";
import { DiscordWrapperMock } from "./mocks/discord";

// this will be the centre of the test, simulating input commands to stimulate output
const discord = new DiscordWrapperMock();

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
});
