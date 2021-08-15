import { expect } from "chai";
import { Message } from "discord.js";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/list";
import { DatabaseTournament, TournamentFormat, TournamentStatus } from "../../src/database/interface";
import { mockBotClient, msg, support, test } from "./common";

const fakeTournaments: DatabaseTournament[] = [
	{
		id: "foo",
		name: "foo tournament",
		status: TournamentStatus.PREPARING,
		players: [],
		// below are irrelevant
		limit: 0,
		description: "",
		format: TournamentFormat.SWISS,
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
	it(
		"rejects non-TOs",
		test(function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").rejects();
			const listStub = this.stub(support.database, "getActiveTournaments");
			msg.channel.send = this.spy();
			expect(command.executor(msg, [], support)).to.be.rejected;
			expect(authStub).to.have.been.called;
			expect(listStub).to.not.have.been.called;
			expect(msg.channel.send).to.not.have.been.called;
		})
	);
	it(
		"lists tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.database, "getActiveTournaments").resolves(fakeTournaments);
			msg.channel.send = this.spy();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.guildId);
			expect(msg.channel.send).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "```\nID: foo|Name: foo tournament|Status: preparing|Players: 0```" })
			);
		})
	);
	it(
		"displays a message when there are no tournaments",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.database, "getActiveTournaments").resolves([]);
			msg.channel.send = this.spy();
			await command.executor(msg, [], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnceWithExactly(msg.guildId);
			expect(msg.channel.send).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "There are no open tournaments you have access to!" })
			);
		})
	);
	it(
		"rethrows reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.database, "getActiveTournaments").resolves(fakeTournaments);
			msg.channel.send = this.stub().rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.send).to.have.been.calledOnce;
			}
		})
	);
	it(
		"rethrows reply exceptions with an empty list",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.organiserRole, "authorise").resolves();
			const listStub = this.stub(support.database, "getActiveTournaments").resolves([]);
			msg.channel.send = this.stub().rejects();
			try {
				await command.executor(msg, [], support);
				expect.fail();
			} catch {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.send).to.have.been.calledOnce;
			}
		})
	);
});
