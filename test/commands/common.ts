import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandDefinition, CommandSupport } from "../../src/Command";
import { DeckManager } from "../../src/deck";
import { DiscordInterface } from "../../src/discord/interface";
import { OrganiserRoleProvider } from "../../src/role/organiser";
import { ParticipantRoleProvider } from "../../src/role/participant";
import { Templater } from "../../src/templates";
import { TimeWizard } from "../../src/timer";
import { WebsiteInterface } from "../../src/website/interface";
import { DatabaseWrapperMock } from "../mocks/database";
import { DiscordWrapperMock } from "../mocks/discord";
import { TournamentMock } from "../mocks/tournament";
import { WebsiteWrapperMock } from "../mocks/website";

chai.use(chaiAsPromised);
chai.use(sinonChai);
export const test = sinonTest(sinon);

export function itRejectsNonHosts(
	support: CommandSupport,
	command: CommandDefinition,
	msg: Message,
	args: string[]
): void {
	it(
		"rejects non-hosts",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").rejects();
			msg.channel.createMessage = sinon.spy();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(msg.channel.createMessage).to.not.have.been.called;
		})
	);
}

// This is created so we can stub out methods. Most Eris objects also need this as a constructor parameter.
export const mockBotClient = new Client("mock");
// For the purposes of most commands, most fields don't matter. This is the minimum to make the constructor run.
export const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, mockBotClient);

export const support: CommandSupport = {
	discord: new DiscordInterface(new DiscordWrapperMock()),
	tournamentManager: new TournamentMock(),
	organiserRole: new OrganiserRoleProvider("MC-TO"),
	database: new DatabaseWrapperMock(),
	challonge: new WebsiteInterface(new WebsiteWrapperMock()),
	scores: new Map(),
	decks: new DeckManager(new Map()),
	participantRole: new ParticipantRoleProvider(mockBotClient),
	templater: new Templater(),
	timeWizard: new TimeWizard({
		sendMessage: sinon.stub(),
		editMessage: sinon.stub()
	})
};
