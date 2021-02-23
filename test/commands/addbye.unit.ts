import { expect } from "chai";
import { User } from "eris";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/addbye";
import { itRejectsNonHosts, mockBotClient, msg, support, test } from "./common";

describe("command:addbye", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.createMessage).to.not.have.been.called;
	});
	it(
		"adds the mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = [new User({ id: "nova" }, mockBotClient)];
			msg.channel.createMessage = this.spy();
			this.stub(support.database, "registerBye").resolves([]);
			await command.executor(msg, ["name"], support);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"Bye registered for Player <@nova> (nova) in Tournament name!\nAll byes: "
			);
		})
	);
});
