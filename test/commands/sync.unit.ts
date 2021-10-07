import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/sync";
import { itRejectsNonHosts, msg, support, test, websiteTournament } from "./common";

describe("command:sync", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"confirms synchronisation",
		test(async function (this: SinonSandbox) {
			this.stub(msg, "reply").resolves();
			this.stub(support.challonge, "getTournament").resolves(websiteTournament);
			this.stub(support.challonge, "updateTournament").resolves();
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"**Tournament 1** database successfully synchronised with remote website."
			);
		})
	);
});
