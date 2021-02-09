import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/pie";
import { initializeCardArray } from "../../src/deck/deck";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:pie", function () {
	const args = ["battlecity"];
	before(initializeCardArray);
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"provides a dump of all themes",
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
				"Archetype counts for Tournament battlecity are attached.",
				{
					name: "battlecity Pie.csv",
					file: `Theme,Count\nNo themes,3`
				}
			);
		})
	);
	it(
		"does not catch intervening exceptions",
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
					"Archetype counts for Tournament battlecity are attached.",
					{
						name: "battlecity Pie.csv",
						file: "Theme,Count"
					}
				);
			}
		})
	);
});