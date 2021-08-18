import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/help";
import { msg, support } from "./common";

describe("command:help", function () {
	before(() => sinon.stub(msg, "reply").resolves());
	after(() => sinon.restore());
	it("responds with a help message", async () => {
		await command.executor(msg, [], support);
		expect(msg.reply).to.have.been.calledOnce;
	});
});
