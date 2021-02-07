import { expect } from "chai";
import { User } from "eris";
import sinon from "sinon";
import command from "../../src/commands/forcescore";
import { itRejectsNonHosts, mockBotClient, msg, support } from "./common";

describe("command:forcescore", function () {
	const scoreStub = sinon.stub(support.tournamentManager, "submitScoreForce").resolves("");
	beforeEach(scoreStub.resetHistory);
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.createMessage).to.not.have.been.called;
	});
	it("submits good scores", async () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "2-1"], support);
		expect(scoreStub).to.have.been.calledOnceWithExactly("name", "nova", 2, 1);
	});
	it("rejects bad scores", () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name", "they won"], support)).to.be.rejectedWith(
			"Must provide score in format `#-#` e.g. `2-1`."
		);
	});
});
