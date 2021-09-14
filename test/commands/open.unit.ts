import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/open";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:open", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"opens registration",
		test(async function (this: SinonSandbox) {
			this.stub(msg, "reply").resolves();
			this.stub(support.templater, "format").returns("");
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly("**Tournament 1** opened for registration!");
		})
	);
});
