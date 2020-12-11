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
});
