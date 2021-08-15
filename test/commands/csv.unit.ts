import { expect } from "chai";
import dotenv from "dotenv";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/csv";
import { itRejectsNonHosts, msg, support, test, tournament } from "./common";

dotenv.config();
describe("command:csv", function () {
	const args = ["battlecity"];
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"provides a dump of all players",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").resolves([
				{ discordId: "1312", deck: "ydke://!!!", challongeId: 1 },
				{ discordId: "1314", deck: "ydke://!!!", challongeId: 2 },
				{ discordId: "1234", deck: "ydke://!!!", challongeId: 3 }
			]);
			const restStub = this.stub(support.discord, "getRESTUsername").resolves(null);
			msg.reply = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnce;
			expect(restStub).to.have.been.calledThrice;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				sinon.match({
					content: "A list of players for tournament battlecity with their deck is attached."
				}),
				{
					name: "battlecity.csv",
					file: `Player,Theme,Deck\n1312,No themes,"Main: , Extra: , Side: "\n1314,No themes,"Main: , Extra: , Side: "\n1234,No themes,"Main: , Extra: , Side: "`
				}
			);
		})
	);
	it(
		"warns on an empty tournament",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const listStub = this.stub(support.database, "getConfirmed").resolves([]);
			msg.reply = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnce;
			expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** has no players!");
		})
	);
	it(
		"provides a dump of all themes",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").resolves([
				{ discordId: "1312", deck: "ydke://!!!", challongeId: 1 },
				{ discordId: "1314", deck: "ydke://!!!", challongeId: 2 },
				{ discordId: "1234", deck: "ydke://!!!", challongeId: 3 }
			]);
			msg.reply = this.spy();
			await command.executor(msg, [args[0], "pie"], support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnce;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"A list of themes in tournament battlecity with their counts is attached.",
				{
					name: "battlecity.csv",
					file: `Theme,Count\nNo themes,3`
				}
			);
		})
	);
	it(
		"does not catch intervening exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").rejects();
			msg.reply = this.spy();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.reply).to.not.have.been.called;
			}
		})
	);
	it(
		"does not catch reply exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves(tournament);
			const listStub = this.stub(support.database, "getConfirmed").resolves([]);
			msg.reply = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** has no players!");
			}
		})
	);
});
