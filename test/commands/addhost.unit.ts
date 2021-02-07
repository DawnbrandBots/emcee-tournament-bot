import { expect } from "chai";
import { User } from "eris";
import sinon from "sinon";
import command from "../../src/commands/addhost";
import { itRejectsNonHosts, mockBotClient, msg, support } from "./common";

describe("command:addhost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.createMessage).to.not.have.been.called;
	});
	it("adds the mentioned user", async () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"<@nova> added as a host for Tournament name!"
		);
	});
});
