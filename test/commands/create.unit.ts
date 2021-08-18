import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/create";
import { ChallongeIDConflictError } from "../../src/util/errors";
import { msg, support, test } from "./common";

describe("command:create", function () {
	const args = ["battlecity", "ra"];
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").rejects();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity",
				"Guide: mc!help battlecity"
			]);
			this.stub(msg, "reply").resolves();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(createStub).to.not.have.been.called;
			expect(msg.reply).to.not.have.been.called;
		})
	);
	it(
		"creates tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity",
				"Guide: mc!help battlecity"
			]);
			this.stub(msg, "reply").resolves();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(createStub).to.have.been.calledOnce;
			expect(msg.reply).to.have.been.calledTwice;
			expect(msg.reply).to.have.been.calledWithExactly(
				"Tournament battlecity created! You can find it at https://example.com/battlecity. For future commands, refer to this tournament by the id `battlecity`."
			);
			expect(msg.reply).to.have.been.calledWithExactly("Guide: mc!help battlecity");
		})
	);
	it(
		"handles id conflicts and rethrows",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.reply).to.have.been.calledOnceWithExactly(
					"Tournament ID battlecity already taken on Challonge. This is an error with Emcee, so please report it, but in the meantime, try using a different tournament name."
				);
			}
		})
	);
	it(
		"rethrows other create exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects();
			this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.reply).to.not.have.been.called;
			}
		})
	);
	it(
		"rethrows reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity",
				"Guide: mc!help battlecity"
			]);
			this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.reply).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions when handling conflicts",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.not.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.reply).to.have.been.calledOnce;
			}
		})
	);
});
