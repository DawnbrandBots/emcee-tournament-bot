import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/finish";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:finish", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
	const args = ["battlecity"];
	it(
		"rejects non-hosts",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").rejects();
			const finishStub = this.stub(support.tournamentManager, "finishTournament").resolves();
			msg.channel.createMessage = this.spy();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(finishStub).to.not.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
	it(
		"finishes the tournament",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
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
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
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
			const authStub = this.stub(support.tournamentManager, "authenticateHost").resolves();
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
