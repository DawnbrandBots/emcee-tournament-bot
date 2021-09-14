import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DiscordInterface } from "../src/discord/interface";
import { DiscordWrapperMock } from "./mocks/discord";
chai.use(chaiAsPromised);

const discordMock = new DiscordWrapperMock();
const discord = new DiscordInterface(discordMock);

describe("getUsername", function () {
	it("No special characters", function () {
		expect(discord.getUsername("player1", true)).to.equal("player1");
	});
	it("Successful escape", function () {
		expect(discord.getUsername("player_1", true)).to.equal("player\\_1");
	});
	it("There is no escape", function () {
		expect(discord.getUsername("player_1")).to.equal("player_1");
	});
});
