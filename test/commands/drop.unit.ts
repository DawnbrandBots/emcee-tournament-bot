import { expect } from "chai";
import sinon from "sinon";
import command from "../../src/commands/drop";
import { msg, support } from "./common";

describe("command:drop", function () {
	it("drops the player", async () => {
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Player 0000, you have successfully dropped from Tournament name."
		);
	});
});
