import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/list";
import { DiscordInterface, DiscordMessageIn } from "../../src/discord/interface";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:list", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock()
	};
	const msg: DiscordMessageIn = {
		id: "007",
		content: "irrelevant",
		attachments: [],
		author: "requester",
		channelId: "four",
		serverId: "0000000000000000000000",
		reply: async () => void 0,
		react: async () => void 0,
		edit: async () => void 0
	};
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").rejects();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			const replyStub = this.stub(msg, "reply").resolves();
			expect(command.executor(msg, [], support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(listStub).to.not.have.been.called;
			expect(replyStub).to.not.have.been.called;
		})
	);
	it(
		"lists tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			const replyStub = this.stub(msg, "reply").resolves();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.serverId);
			expect(replyStub).to.have.been.calledOnceWithExactly("```\nfoo```");
		})
	);
	it(
		"displays a message when there are no tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("");
			const replyStub = this.stub(msg, "reply").resolves();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.serverId);
			expect(replyStub).to.have.been.calledOnceWithExactly("There are no open tournaments you have access to!");
		})
	);
	it(
		"rethrows reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			const replyStub = this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions with an empty list",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.discord, "authenticateTO").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("");
			const replyStub = this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnce;
			}
		})
	);
});
