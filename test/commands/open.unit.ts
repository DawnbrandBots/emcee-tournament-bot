import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/open";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:open", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("opens registration", async () => {
		sinon.stub(msg, "reply").resolves();
		await command.executor(msg, ["name"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** opened for registration!");
		sinon.restore();
	});
});
