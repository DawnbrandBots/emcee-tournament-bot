import chai, { expect } from "chai";
import { Client, Message, PrivateChannel } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { TournamentStatus } from "../../src/database/interface";
import { DeckManager, initializeDeckManager } from "../../src/deck";
import { onDirectMessage } from "../../src/events/messageCreate";
import { ParticipantRoleProvider } from "../../src/role/participant";
import { WebsiteInterface } from "../../src/website/interface";
import { DatabaseWrapperMock } from "../mocks/database";
import { WebsiteWrapperMock } from "../mocks/website";
chai.use(sinonChai);
const test = sinonTest(sinon);

// This is created so we can stub out methods. Most Eris objects also need this as a constructor parameter.
const mockBotClient = new Client("mock");
// For the purposes of most commands, most fields don't matter. This is the minimum to make the constructor run.
const sampleMessage = new Message<PrivateChannel>(
	{
		id: "testMessage",
		channel_id: "testChannel",
		author: { id: "testUser" },
		mentions: [],
		attachments: [],
		content:
			"ydke://o6lXBaOpVwWjqVcFep21BXqdtQV6nbUF8GFdAvBhXQLwYV0CLdjxAS3Y8QEt2PEBiWdgA4lnYAOJZ2AD0hVTAtIVUwLSFVMC9slUAvbJVAL2yVQCKYF+BSmBfgUpgX4FYW7uA2Fu7gNhbu4DlDaLBJQ2iwSUNosE0GpSAtBqUgLQalICTIHIAEyByABMgcgAXu5QBV7uUAVe7lAFsdjfAQ==!yV+/A8lfvwPJX78D!sdjfAbHY3wE=!"
	},
	mockBotClient
);
const database = new DatabaseWrapperMock();
let decks: DeckManager;
const challonge = new WebsiteInterface(new WebsiteWrapperMock());
const participantRole = new ParticipantRoleProvider(mockBotClient);

before(async () => {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	decks = await initializeDeckManager(process.env.OCTOKIT_TOKEN!);
});
describe("Direct message submissions", function () {
	// TODO: test attachment version
	it(
		"accepts registrations",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([
				{
					id: "tourn1",
					name: "Tournament 1",
					description: "The first tournament",
					status: TournamentStatus.PREPARING,
					hosts: ["host1"],
					players: [],
					publicChannels: ["channel1"],
					privateChannels: ["channel2"],
					server: "testServer",
					byes: ["player1"],
					findPlayer: () => {
						throw new Error("unused");
					}
				}
			]);
			this.stub(decks, "prettyPrint").returns([{}, { name: "mock", file: "mock" }]);
			this.stub(participantRole, "grant").resolves();
			sampleMessage.channel.createMessage = this.spy();
			this.stub(mockBotClient, "createMessage");
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			expect(mockBotClient.createMessage).to.have.been.calledWith(
				"channel2",
				"<@testUser> (undefined#undefined) has signed up for **Tournament 1** with the following deck!"
			);
			expect(mockBotClient.createMessage).to.have.been.calledWith("channel2", {}, { name: "mock", file: "mock" });
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith(
				"You have successfully signed up for **Tournament 1**! Your deck is below to double-check."
			);
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith({}, { name: "mock", file: "mock" });
		})
	);
	it(
		"stops ambiguous registrations",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([
				{ name: "Tournament 1" },
				{ name: "Tournament 2" }
			] as never);
			sampleMessage.channel.createMessage = this.spy();
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith(
				"You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\nTournament 1, Tournament 2"
			);
		})
	);
	it(
		"sends a help message with no tournaments",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([]);
			this.stub(database, "getConfirmedTournaments").resolves([]);
			sampleMessage.channel.createMessage = this.spy();
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith(
				"Emcee's documentation can be found at https://github.com/AlphaKretin/emcee-tournament-bot/blob/master/README.md.\nRevision: **undefined**\nIf you're trying to sign up for a tournament, make sure you've registered and I'll let you know how to proceed."
			);
		})
	);
	it(
		"rejects illegal decks",
		test(async function (this: SinonSandbox) {
			const content = sampleMessage.content;
			sampleMessage.content = "ydke://!!!";
			const replySpy = (sampleMessage.channel.createMessage = this.spy());
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			sampleMessage.content = content;
			expect(replySpy.args[0][0].embed.fields[1].value).to.equal(
				"Main Deck too small! Should be at least 40, is 0!"
			);
		})
	);
	it(
		"stops ambiguous deck updates",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([]);
			this.stub(database, "getConfirmedTournaments").resolves([
				{ name: "Tournament 1" },
				{ name: "Tournament 3" }
			] as never);
			sampleMessage.channel.createMessage = this.spy();
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith(
				"You're trying to update your deck for a tournament, but you're in multiple! Please choose one by dropping and registering again.\nTournament 1, Tournament 3"
			);
		})
	);
	it(
		"accepts deck updates",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([]);
			this.stub(database, "getConfirmedTournaments").resolves([
				{
					id: "tourn1",
					name: "Tournament 1",
					description: "The first tournament",
					status: TournamentStatus.PREPARING,
					hosts: ["host1"],
					players: [],
					publicChannels: ["channel1"],
					privateChannels: ["channel2"],
					server: "testServer",
					byes: ["player1"],
					findPlayer: () => {
						throw new Error("unused");
					}
				}
			]);
			this.stub(decks, "prettyPrint").returns([{}, { name: "mock", file: "mock" }]);
			this.stub(database, "updateDeck").resolves();
			sampleMessage.channel.createMessage = this.spy();
			this.stub(mockBotClient, "createMessage");
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			expect(mockBotClient.createMessage).to.have.been.calledWith(
				"channel2",
				"<@testUser> (undefined#undefined) has updated their deck for **Tournament 1** to the following!"
			);
			expect(mockBotClient.createMessage).to.have.been.calledWith("channel2", {}, { name: "mock", file: "mock" });
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith(
				"You have successfully changed your deck for **Tournament 1**! Your deck is below to double-check."
			);
			expect(sampleMessage.channel.createMessage).to.have.been.calledWith({}, { name: "mock", file: "mock" });
		})
	);
	it(
		"rejects illegal deck updates",
		test(async function (this: SinonSandbox) {
			this.stub(database, "getPendingTournaments").resolves([]);
			this.stub(database, "getConfirmedTournaments").resolves([
				{
					id: "tourn1",
					name: "Tournament 1",
					description: "The first tournament",
					status: TournamentStatus.PREPARING,
					hosts: ["host1"],
					players: [],
					publicChannels: ["channel1"],
					privateChannels: ["channel2"],
					server: "testServer",
					byes: ["player1"],
					findPlayer: () => {
						throw new Error("unused");
					}
				}
			]);
			const content = sampleMessage.content;
			sampleMessage.content = "ydke://!!!";
			const replySpy = (sampleMessage.channel.createMessage = this.spy());
			await onDirectMessage(sampleMessage, database, decks, challonge, participantRole, mockBotClient);
			sampleMessage.content = content;
			expect(replySpy.args[0][0].embed.fields[1].value).to.equal(
				"Main Deck too small! Should be at least 40, is 0!"
			);
		})
	);
});
