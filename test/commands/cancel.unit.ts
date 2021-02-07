import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/cancel";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:cancel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("cancels the tournament", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly("Tournament name successfully canceled.");
	});
});
