import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/finish";
import { itRejectsNonHosts, msg, support, test, tournament } from "./common";

describe("command:finish", function () {
	const args = ["battlecity"];
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"finishes the tournament",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			this.stub(msg, "reply").resolves();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(finishStub).to.have.been.calledOnceWithExactly("battlecity", false);
			expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** successfully finished.");
		})
	);
	// TODO: specifically mock challonge-level stuff about whether all match scores are in or not?
	it(
		"suggests early on finishTournament exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const finishStub = this.stub(support.tournamentManager, "finishTournament").rejects();
			this.stub(msg, "reply").resolves();
			// no try catch because executor does not throw, it handles error
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(finishStub).to.have.been.calledOnce;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"**Tournament 1** is not finished. If you intend to end it early, use `mc!finish battlecity|early`."
			);
		})
	);
	it(
		"finishes the tournament early",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			this.stub(msg, "reply").resolves();
			await command.executor(msg, [...args, "early"], support);
			expect(authStub).to.have.been.called;
			expect(finishStub).to.have.been.calledOnceWithExactly("battlecity", true);
			expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** successfully finished.");
		})
	);
	it(
		"does not catch finishTournament exceptions when early",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const finishStub = this.stub(support.tournamentManager, "finishTournament").rejects();
			this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, [...args, "early"], support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(finishStub).to.have.been.calledOnceWithExactly("battlecity", true);
				expect(msg.reply).to.not.have.been.called;
			}
		})
	);
	it(
		"does not catch reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(finishStub).to.have.been.calledOnce;
				expect(msg.reply).to.have.been.calledOnce;
			}
		})
	);
});
