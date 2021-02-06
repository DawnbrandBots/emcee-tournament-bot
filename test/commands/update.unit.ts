import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandSupport } from "../../src/Command";
import command from "../../src/commands/update";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";

chai.use(chaiAsPromised);
chai.use(sinonChai);
const test = sinonTest(sinon);

describe("command:update", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO")
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
	it(
		"rejects non-hosts",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.tournamentManager, "authenticateHost").rejects();
			msg.channel.createMessage = sinon.spy();
			expect(command.executor(msg, ["name", "newName", "newDesc"], support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
	it("responds with an update message", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "newName", "newDesc"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Tournament `name` updated! It now has the name newName and the given description."
		);
	});
});
