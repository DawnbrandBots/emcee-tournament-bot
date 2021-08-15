import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/open";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:open", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("opens registration", async () => {
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "**Tournament 1** opened for registration!" })
		);
	});
});
