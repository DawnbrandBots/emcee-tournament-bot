import { expect } from "chai";
import { MessageMentions } from "discord.js";
import sinon from "sinon";
import command from "../../src/commands/addhost";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:addhost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = new MessageMentions(msg, [], [], false);
		msg.reply = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.reply).to.not.have.been.called;
	});
	it("adds the mentioned user", async () => {
		msg.mentions = new MessageMentions(
			msg,
			[{ id: "nova", username: "K", discriminator: "1234", avatar: "k.png" }],
			[],
			false
		);
		msg.reply = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly("<@nova> added as a host for **Tournament 1**!");
	});
});
