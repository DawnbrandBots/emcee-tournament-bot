import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
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
			msg.channel.createMessage = this.spy();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(createStub).to.not.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
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
			msg.channel.createMessage = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(createStub).to.have.been.calledOnce;
			expect(msg.channel.createMessage).to.have.been.calledTwice;
			expect(msg.channel.createMessage).to.have.been.calledWithExactly(
				sinon.match({
					content:
						"**Tournament 1** created! You can find it at https://example.com/battlecity. For future commands, refer to this tournament by the id `battlecity`."
				})
			);
			expect(msg.channel.createMessage).to.have.been.calledWithExactly(
				sinon.match({ content: "Guide: mc!help battlecity" })
			);
		})
	);
	it(
		"handles id conflicts and rethrows",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			msg.channel.createMessage = this.spy();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
					sinon.match({
						content:
							"Tournament ID battlecity already taken on Challonge. This is an error with Emcee, so please report it, but in the meantime, try using a different tournament name."
					})
				);
			}
		})
	);
	it(
		"rethrows other create exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects();
			msg.channel.createMessage = this.spy();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.not.have.been.called;
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
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions when handling conflicts",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.not.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnce;
			}
		})
	);
});
