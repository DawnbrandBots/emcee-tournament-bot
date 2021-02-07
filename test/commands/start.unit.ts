import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/start";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:start", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("starts the tournament", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly("Tournament name successfully commenced!");
	});
});
