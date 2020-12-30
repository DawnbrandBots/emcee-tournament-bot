import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/dump";
import { DiscordInterface, DiscordMessageIn } from "../../src/discord/interface";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:dump", function () {
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
	const args = ["battlecity"];
	void command;
	it(
		"rejects non-hosts",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").rejects();
			const dumpStub = this.stub(support.tournamentManager, "generateDeckDump").resolves({
				filename: "foo.csv",
				contents: ""
			});
			const replyStub = this.stub(msg, "reply").resolves();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(dumpStub).to.not.have.been.called;
			expect(replyStub).to.not.have.been.called;
		})
	);
	it(
		"provides a dump of all decks",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const attachment = {
				filename: "foo.csv",
				contents: ""
			};
			const dumpStub = this.stub(support.tournamentManager, "generateDeckDump").resolves(attachment);
			const replyStub = this.stub(msg, "reply").resolves();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(dumpStub).to.have.been.calledOnce;
			expect(replyStub).to.have.been.calledOnceWithExactly(
				"Player decklists for Tournament battlecity is attached.",
				attachment
			);
		})
	);
	it(
		"does not catch generateDeckDump exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const dumpStub = this.stub(support.tournamentManager, "generateDeckDump").rejects();
			const replyStub = this.stub(msg, "reply").resolves();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(dumpStub).to.have.been.calledOnce;
				expect(replyStub).to.not.have.been.called;
			}
		})
	);
	it(
		"does not catch reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const attachment = {
				filename: "foo.csv",
				contents: ""
			};
			const dumpStub = this.stub(support.tournamentManager, "generateDeckDump").resolves(attachment);
			const replyStub = this.stub(msg, "reply").rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(dumpStub).to.have.been.calledOnce;
				expect(replyStub).to.have.been.calledOnce;
			}
		})
	);
});
