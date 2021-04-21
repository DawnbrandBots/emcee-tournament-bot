import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/sync";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:sync", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("confirms synchronisation", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "Tournament name database successfully synchronised with remote website." })
		);
	});
});
