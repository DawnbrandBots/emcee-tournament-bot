import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/forcedrop";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:forcedrop", function () {
	sinon.stub(support.discord, "getRESTUsername").resolves("nova");
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("drops the mentioned user", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "<@!nova>"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Player nova successfully dropped from Tournament name."
		);
	});
	it("drops the snowflake", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "nova"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Player nova successfully dropped from Tournament name."
		);
	});
	after(() => sinon.restore());
});
