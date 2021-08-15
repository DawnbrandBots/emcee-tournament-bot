import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/sync";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:sync", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("confirms synchronisation", async () => {
		msg.reply = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"**Tournament 1** database successfully synchronised with remote website."
		);
	});
});
