import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/update";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:update", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("responds with an update message", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "newName", "newDesc"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Tournament `name` updated! It now has the name newName and the given description."
		);
	});
});
