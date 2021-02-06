import chai, { expect } from "chai";
import { Client, Message } from "eris";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/help";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(sinonChai);

describe("command:help", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
	it("responds with a help message", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, [], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	});
});
