import { expect } from "chai";
import { Message } from "eris";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/list";
import { DatabaseTournament, TournamentStatus } from "../../src/database/interface";
import { mockBotClient, support, test } from "./common";

const fakeTournaments: DatabaseTournament[] = [
	{
		id: "foo",
		name: "foo tournament",
		status: TournamentStatus.PREPARING,
		players: [],
		// below are irrelevant
		description: "",
		hosts: [],
		server: "",
		publicChannels: [],
		privateChannels: [],
		byes: [],
		findPlayer: () => {
			return { discordId: "", challongeId: 0, deck: "" };
		}
	}
];

describe("command:list", function () {
	const msg = new Message(
		{ id: "007", channel_id: "foo", guild_id: "public", author: { id: "0000" } },
		mockBotClient
	);
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").rejects();
			const listStub = this.stub(support.database, "getActiveTournaments");
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
			const listStub = this.stub(support.database, "getActiveTournaments").resolves(fakeTournaments);
			msg.channel.createMessage = this.spy();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.guildID);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"```\nID: foo|Name: foo tournament|Status: preparing|Players: 0```"
			);
		})
	);
	it(
		"displays a message when there are no tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.database, "getActiveTournaments").resolves([]);
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
			const listStub = this.stub(support.database, "getActiveTournaments").resolves(fakeTournaments);
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
			const listStub = this.stub(support.database, "getActiveTournaments").resolves([]);
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
