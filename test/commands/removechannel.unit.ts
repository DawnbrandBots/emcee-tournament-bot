import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/removechannel";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:removechannel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("removes a public channel by default", async () => {
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "This channel removed as a public announcement channel for **Tournament 1**!" })
		);
	});
	it("removes public channels", async () => {
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name", "public"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "This channel removed as a public announcement channel for **Tournament 1**!" })
		);
	});
	it("removes private channels", async () => {
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name", "private"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "This channel removed as a private announcement channel for **Tournament 1**!" })
		);
	});
});
