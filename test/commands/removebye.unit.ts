import { expect } from "chai";
import { MessageMentions } from "discord.js";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/removebye";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:removebye", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"requires a mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(msg, [], [], false);
			this.stub(msg, "reply").resolves();
			expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
			expect(msg.reply).to.not.have.been.called;
		})
	);
	it(
		"removes the mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(
				msg,
				[{ id: "nova", username: "K", discriminator: "0000", avatar: "k.png" }],
				[],
				false
			);
			this.stub(msg, "reply").resolves();
			this.stub(support.database, "removeBye").resolves([]);
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"Bye removed for <@nova> (K#0000) in **Tournament 1**!\nAll byes: "
			);
		})
	);
});
