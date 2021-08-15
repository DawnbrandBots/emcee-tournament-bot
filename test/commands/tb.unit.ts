import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/tb";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:tb", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"responds with current state",
		test(async function (this: SinonSandbox) {
			support.challonge.updateTieBreakers = sinon.spy();
			this.stub(msg, "reply").resolves();
			await command.executor(msg, ["name"], support);
			expect(support.challonge.updateTieBreakers).to.not.have.been.called;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"**Tournament 1** has the following tie-breaker priority:\n1. Median-Buchholz system\n2. Points Difference\n3. Wins vs Tied Participants"
			);
		})
	);
	it(
		"updates tie-breaker settings",
		test(async function (this: SinonSandbox) {
			support.challonge.updateTieBreakers = sinon.spy();
			this.stub(msg, "reply").resolves();
			await command.executor(msg, ["name", "match wins", "game wins", "points scored"], support);
			expect(support.challonge.updateTieBreakers).to.have.been.calledOnce;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"Tie-breaker settings updated for **Tournament 1**.\n1. Match Wins\n2. Game/Set Wins\n3. Points Scored"
			);
		})
	);
	it(
		"provides advice on invalid input",
		test(async function (this: SinonSandbox) {
			support.challonge.updateTieBreakers = sinon.spy();
			this.stub(msg, "reply").resolves();
			await command.executor(msg, ["name", "match wins"], support);
			expect(support.challonge.updateTieBreakers).to.not.have.been.called;
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"Could not update tie-breakers for **Tournament 1**. You must provide three valid options in priority order. The valid options and their corresponding meaning are:\n" +
					"`match wins` (Match Wins)\n`game wins` (Game/Set Wins)\n`game win percentage` (Game/Set Win %)\n`points scored` (Points Scored)\n`points difference` (Points Difference)\n`match wins vs tied` (Wins vs Tied Participants)\n`median buchholz` (Median-Buchholz system)"
			);
		})
	);
});
