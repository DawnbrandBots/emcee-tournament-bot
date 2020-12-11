import { expect } from "chai";
import { CommandHandler } from "../src/CommandHandler";
import { DiscordInterface } from "../src/discord/interface";
import logger from "../src/logger";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";

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
});
describe("Tournament creation commands", function () {
	it("Create tournament", async function () {
		await discord.simMessage("mc!create name|desc", "create");
		const response = discord.getResponse("create");
		expect(response).to.equal(
			"Tournament name created! You can find it at https://example.com/name. For future commands, refer to this tournament by the id `mc_name`."
		);
	});
	it("Update tournament"); // not specifying a function marks it as a test to be written
	it("Add channel");
	it("Remove channel");
	it("Add host");
	it("Remove host");
});
describe("Tournament flow commands", function () {
	it("Open tournament");
	it("Start tournament");
	it("Cancel tournament");
	it("Submit score");
	it("Next round");
});
describe("Minor tournament commads", function () {
	it("List players");
	it("Get player deck");
	it("Drop self");
	it("Drop player");
	it("Sync");
	it("Pie chart");
});
