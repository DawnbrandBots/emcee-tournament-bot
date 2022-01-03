import { expect } from "chai";
import { MessageMentions } from "discord.js";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/addhost";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:addhost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"requires a mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = Reflect.construct(MessageMentions, [msg, [], [], false]);
			this.stub(msg, "reply").resolves();
			expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
			expect(msg.reply).to.not.have.been.called;
		})
	);
	it(
		"adds the mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = Reflect.construct(MessageMentions, [
				msg,
				[{ id: "2021", username: "K", discriminator: "1234", avatar: "k.png" }],
				[],
				false
			]);
			this.stub(msg, "reply").resolves();
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly("<@2021> added as a host for **Tournament 1**!");
		})
	);
});
