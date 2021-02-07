import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/round";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:round", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("sends a round advance announcement", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"New round successfully started for Tournament name."
		);
	});
});
