import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Client, Message } from "discord.js";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { CommandDefinition, CommandSupport } from "../../src/Command";
import { DatabaseTournament, TournamentFormat, TournamentStatus } from "../../src/database/interface";
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
			msg.channel.send = sinon.spy();
			expect(command.executor(msg, args, support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(msg.channel.send).to.not.have.been.called;
		})
	);
}

// This is created so we can stub out methods. Most Eris objects also need this as a constructor parameter.
export const mockBotClient = new Client({ intents: [] });
// For the purposes of most commands, most fields don't matter. This is the minimum to make the constructor run.
export const msg = new Message(new Client({ intents: [] }), {
	id: "007",
	channel_id: "foo",
	author: { id: "0000", username: "K", discriminator: "1234", avatar: "k.png" },
	content: ".",
	timestamp: "1",
	edited_timestamp: "1",
	tts: false,
	mention_everyone: false,
	mentions: [],
	mention_roles: [],
	attachments: [],
	embeds: [],
	pinned: false,
	type: 0
});
// for the purposes of testing, needs a valid name to be displayed by command responses
export const tournament: DatabaseTournament = {
	name: "Tournament 1",
	id: "name",
	description: "",
	format: TournamentFormat.SWISS,
	status: TournamentStatus.IPR,
	hosts: [],
	players: [],
	limit: 256,
	server: "",
	publicChannels: [],
	privateChannels: [],
	byes: [],
	findPlayer: sinon.stub()
};

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
