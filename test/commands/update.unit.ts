import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/update";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:update", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("responds with an update message", async () => {
		msg.reply = sinon.spy();
		await command.executor(msg, ["name", "newName", "newDesc"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"Tournament `name` updated! It now has the name newName and the given description."
		);
	});
	it(
		"calls the appropriate functions",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "updateTournament").resolves();
			this.stub(support.challonge, "updateTournament").resolves();
			await command.executor(msg, ["name", "newName", "newDesc"], support);
			expect(support.database.updateTournament).to.have.been.calledOnceWithExactly("name", "newName", "newDesc");
			expect(support.challonge.updateTournament).to.have.been.calledOnceWithExactly("name", "newName", "newDesc");
		})
	);
	it(
		"does not update challonge if database throws",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "updateTournament").rejects();
			this.stub(support.challonge, "updateTournament").resolves();
			try {
				await command.executor(msg, ["name", "newName", "newDesc"], support);
				expect.fail();
			} catch (e) {
				expect(support.database.updateTournament).to.have.been.calledOnceWithExactly(
					"name",
					"newName",
					"newDesc"
				);
				expect(support.challonge.updateTournament).to.have.not.been.called;
			}
		})
	);
});
