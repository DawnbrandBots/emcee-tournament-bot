import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/finish";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:finish", function () {
	const args = ["battlecity"];
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"finishes the tournament",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			msg.channel.createMessage = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(finishStub).to.have.been.calledOnceWithExactly("battlecity", false);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"Tournament battlecity successfully finished."
			);
		})
	);
	it(
		"does not catch finishTournament exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const finishStub = this.stub(support.tournamentManager, "finishTournament").rejects();
			msg.channel.createMessage = this.spy();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(finishStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.not.have.been.called;
			}
		})
	);
	it(
		"does not catch reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(finishStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnce;
			}
		})
	);
});
