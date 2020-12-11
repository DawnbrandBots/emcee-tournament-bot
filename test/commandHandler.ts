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
	it("Update tournament", async function () {
		await discord.simMessage("mc!update mc_name|newName|newDesc", "update");
		const response = discord.getResponse("update");
		expect(response).to.equal(
			"Tournament `mc_name` updated! It now has the name newName and the given description."
		);
	});
	it("Add channel", async function () {
		// channel mentions must be digits
		await discord.simMessage("mc!addchannel mc_name|public|<#1101>", "addchannel");
		expect(discord.getResponse("1101")).to.equal(
			"This channel added as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("addchannel")).to.equal(
			`${mockDiscord.mentionChannel("1101")} added as a public announcement channel for Tournament mc_name!`
		);
	});
	it("Remove channel", async function () {
		await discord.simMessage("mc!removechannel mc_name|public|<#1102>", "remchannel");
		expect(discord.getResponse("1102")).to.equal(
			"This channel removed as a public announcement channel for Tournament mc_name!"
		);
		expect(discord.getResponse("remchannel")).to.equal(
			`${mockDiscord.mentionChannel("1102")} removed as a public announcement channel for Tournament mc_name!`
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
	it("Submit score", async function () {
		await discord.simMessage("mc!score mc_name|2-1", "score");
		expect(discord.getResponse("score")).to.equal("For more detail, test the tournament handler!");
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
describe("Minor tournament commads", function () {
	it("List players");
	it("Get player deck");
	it("Drop self");
	it("Drop player");
	it("Sync");
	it("Pie chart");
});
