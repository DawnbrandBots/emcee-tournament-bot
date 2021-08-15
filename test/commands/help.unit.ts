import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/help";
import { msg, support } from "./common";

describe("command:help", function () {
	it("responds with a help message", async () => {
		msg.reply = sinon.spy();
		await command.executor(msg, [], support);
		expect(msg.reply).to.have.been.calledOnce;
	});
});
