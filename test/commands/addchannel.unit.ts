import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/addchannel";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:addchannel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("adds a public channel by default", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"This channel added as a public announcement channel for Tournament name!"
		);
	});
	it("adds public channels", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "public"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"This channel added as a public announcement channel for Tournament name!"
		);
	});
	it("adds private channels", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "private"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"This channel added as a private announcement channel for Tournament name!"
		);
	});
});
