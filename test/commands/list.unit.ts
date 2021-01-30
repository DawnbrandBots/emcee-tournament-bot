import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/list";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:list", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message(
		{ id: "007", channel_id: "foo", guild_id: "public", author: { id: "0000" } },
		new Client("mock")
	);
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").rejects();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			msg.channel.createMessage = this.spy();
			expect(command.executor(msg, [], support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(listStub).to.not.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
	it(
		"lists tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			msg.channel.createMessage = this.spy();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.guildID);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly("```\nfoo```");
		})
	);
	it(
		"displays a message when there are no tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("");
			msg.channel.createMessage = this.spy();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.guildID);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"There are no open tournaments you have access to!"
			);
		})
	);
	it(
		"rethrows reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("foo");
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions with an empty list",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.tournamentManager, "listTournaments").resolves("");
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnce;
			}
		})
	);
});
