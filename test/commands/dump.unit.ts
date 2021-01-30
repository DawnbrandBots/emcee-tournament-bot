import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/dump";
import { initializeCardArray } from "../../src/deck/deck";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:dump", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
	const args = ["battlecity"];
	before(initializeCardArray);
	it(
		"rejects non-hosts",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").rejects();
			const listStub = this.stub(support.tournamentManager, "getConfirmed").resolves([]);
			msg.channel.createMessage = this.spy();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(listStub).to.not.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
	it(
		"provides a dump of all decks",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const listStub = this.stub(support.tournamentManager, "getConfirmed").resolves([
				{ discordId: "1312", deck: "ydke://!!!", challongeId: 1 },
				{ discordId: "1314", deck: "ydke://!!!", challongeId: 2 },
				{ discordId: "1234", deck: "ydke://!!!", challongeId: 3 }
			]);
			msg.channel.createMessage = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnce;
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"Player decklists for Tournament battlecity is attached.",
				{
					name: "battlecity Decks.csv",
					file:
						`Player,Deck\n` +
						`1312,"Main: , Extra: , Side: "\n` +
						`1314,"Main: , Extra: , Side: "\n` +
						`1234,"Main: , Extra: , Side: "`
				}
			);
		})
	);
	it(
		"does not catch generateDeckDump exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const listStub = this.stub(support.tournamentManager, "getConfirmed").rejects();
			msg.channel.createMessage = this.spy();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.not.have.been.called;
			}
		})
	);
	it(
		"does not catch reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
			const listStub = this.stub(support.tournamentManager, "getConfirmed").resolves([]);
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
					"Player decklists for Tournament battlecity is attached.",
					{
						name: "battlecity Decks.csv",
						file: ""
					}
				);
			}
		})
	);
});
