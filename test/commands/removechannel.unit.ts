import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/removechannel";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:removechannel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
});
describe("command:removechannel", function () {
	beforeEach(() => sinon.stub(msg, "reply").resolves());
	afterEach(() => sinon.restore());
	it("removes a public channel by default", async () => {
		await command.executor(msg, ["name"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"This channel removed as a public announcement channel for **Tournament 1**!"
		);
	});
	it("removes public channels", async () => {
		await command.executor(msg, ["name", "public"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"This channel removed as a public announcement channel for **Tournament 1**!"
		);
	});
	it("removes private channels", async () => {
		await command.executor(msg, ["name", "private"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"This channel removed as a private announcement channel for **Tournament 1**!"
		);
	});
});
