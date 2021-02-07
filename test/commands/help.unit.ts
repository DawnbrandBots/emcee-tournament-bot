import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/help";
import { msg, support } from "./common";

describe("command:help", function () {
	it("responds with a help message", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, [], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/wiki."
		);
	});
});
