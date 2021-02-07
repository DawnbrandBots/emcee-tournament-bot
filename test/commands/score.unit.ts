import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/score";
import { msg, support, test } from "./common";

describe("command:score", function () {
	const replySpy = (msg.channel.createMessage = sinon.spy());
	const scoreStub = sinon.stub(support.tournamentManager, "submitScore").resolves("");
	beforeEach(scoreStub.resetHistory);
	it(
		"rejects non-players",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticatePlayer").rejects();
			expect(command.executor(msg, ["name", "2-0"], support)).to.be.rejected;
			expect(authStub).to.have.been.calledOnceWithExactly("name", "0000");
			expect(replySpy).to.not.have.been.called;
		})
	);
	it("submits good scores", async () => {
		await command.executor(msg, ["name", "2-1"], support);
		expect(scoreStub).to.have.been.calledOnceWithExactly("name", "0000", 2, 1);
	});
	it("rejects bad scores", () => {
		expect(command.executor(msg, ["name", "i won"], support)).to.be.rejectedWith(
			"Must provide score in format `#-#` e.g. `2-1`."
		);
	});
});
