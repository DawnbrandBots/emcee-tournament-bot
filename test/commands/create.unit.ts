import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/create";
import { DiscordInterface, DiscordMessageIn } from "../../src/discord/interface";
import { ChallongeIDConflictError } from "../../src/util/errors";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:create", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock()
	};
	const msg: DiscordMessageIn = {
		id: "007",
		content: "irrelevant",
		attachments: [],
		author: "creator",
		channelId: "four",
		serverId: "six",
		reply: async () => void 0,
		react: async () => void 0,
		edit: async () => void 0
	};
	const args = ["battlecity", "ra"];
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").rejects();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity"
			]);
			const replyStub = this.stub(msg, "reply").resolves();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(createStub).to.not.have.been.called;
			expect(replyStub).to.not.have.been.called;
		})
	);
	it(
		"creates tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity"
			]);
			const replyStub = this.stub(msg, "reply").resolves();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(createStub).to.have.been.calledOnce;
			expect(replyStub).to.have.been.calledOnceWithExactly(
				"Tournament battlecity created! You can find it at https://example.com/battlecity. For future commands, refer to this tournament by the id `battlecity`."
			);
		})
	);
	it(
		"handles id conflicts and rethrows",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			const replyStub = this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnceWithExactly(
					"Tournament ID battlecity already taken on Challonge. This is an error with Emcee, so please report it, but in the meantime, try using a different tournament name."
				);
			}
		})
	);
	it(
		"rethrows other create exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects();
			const replyStub = this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(replyStub).to.not.have.been.called;
			}
		})
	);
	it(
		"rethrows reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const createStub = this.stub(support.tournamentManager, "createTournament").resolves([
				"battlecity",
				"https://example.com/battlecity"
			]);
			const replyStub = this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions when handling conflicts",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const error = new ChallongeIDConflictError("battlecity");
			const createStub = this.stub(support.tournamentManager, "createTournament").rejects(error);
			const replyStub = this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(e).to.not.equal(error);
				expect(authStub).to.have.been.called;
				expect(createStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnce;
			}
		})
	);
});
