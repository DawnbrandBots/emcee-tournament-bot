import { expect } from "chai";
import { MessageMentions, User } from "discord.js";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/addbye";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:addbye", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = new MessageMentions(msg, [], [], false);
		msg.channel.send = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.send).to.not.have.been.called;
	});
	it(
		"adds the mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(
				msg,
				[{ id: "nova", username: "K", discriminator: "1234", avatar: "k.png" }],
				[],
				false
			);
			msg.channel.send = this.spy();
			this.stub(support.database, "registerBye").resolves([]);
			await command.executor(msg, ["name"], support);
			expect(msg.channel.send).to.have.been.calledOnceWithExactly(
				sinon.match({
					content: "Bye registered for Player <@nova> (nova) in **Tournament 1**!\nAll byes: "
				})
			);
		})
	);
});
