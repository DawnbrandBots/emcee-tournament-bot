import { expect } from "chai";
import dotenv from "dotenv";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/dump";
import { initializeCardArray } from "../../src/deck/deck";
import { itRejectsNonHosts, msg, support, test } from "./common";

dotenv.config();
describe("command:dump", function () {
	const args = ["battlecity"];
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	before(() => initializeCardArray(process.env.OCTOKIT_TOKEN!));
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"provides a dump of all decks",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").resolves([
				{ discordId: "1312", deck: "ydke://!!!", challongeId: 1 },
				{ discordId: "1314", deck: "ydke://!!!", challongeId: 2 },
				{ discordId: "1234", deck: "ydke://!!!", challongeId: 3 }
			]);
			msg.channel.createMessage = this.spy();
			await command.executor(msg, args, support);
			expect(authStub).to.have.been.called;
			expect(listStub).to.have.been.calledOnce;
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				"Player decklists for Tournament battlecity is attached.",
				{
					name: "battlecity Decks.csv",
					file:
						`Player,Deck\n` +
						`1312,"Main: , Extra: , Side: "\n` +
						`1314,"Main: , Extra: , Side: "\n` +
						`1234,"Main: , Extra: , Side: "`
				}
			);
		})
	);
	it(
		"does not catch intervening exceptions",
		test(async function (this: SinonSandbox) {
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").rejects();
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
			const authStub = this.stub(support.database, "authenticateHost").resolves();
			const listStub = this.stub(support.database, "getConfirmed").resolves([]);
			msg.channel.createMessage = this.stub().rejects();
			try {
				await command.executor(msg, args, support);
				expect.fail();
			} catch (e) {
				expect(authStub).to.have.been.called;
				expect(listStub).to.have.been.calledOnce;
				expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
					"Player decklists for Tournament battlecity is attached.",
					{
						name: "battlecity Decks.csv",
						file: ""
					}
				);
			}
		})
	);
});
