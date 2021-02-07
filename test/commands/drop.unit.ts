import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/drop";
import { msg, support, test } from "./common";

describe("command:drop", function () {
	it(
		"rejects non-players",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticatePlayer").rejects();
			msg.channel.createMessage = this.spy();
			expect(command.executor(msg, ["name"], support)).to.be.rejected;
			expect(authStub).to.have.been.calledOnceWithExactly("name", "0000");
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
	it("drops the player", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Player 0000, you have successfully dropped from Tournament name."
		);
	});
});
