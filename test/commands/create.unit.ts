import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/create";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { ChallongeIDConflictError } from "../../src/util/errors";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:create", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
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
				"Tournament battlecity created! You can find it at https://example.com/battlecity. For future commands, refer to this tournament by the id `battlecity`."
			);
			expect(msg.channel.createMessage).to.have.been.calledWithExactly("Guide: mc!help battlecity");
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
