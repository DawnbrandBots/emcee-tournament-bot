import { expect } from "chai";
import { User } from "eris";
import sinon from "sinon";
import command from "../../src/commands/forcescore";
import { mockBotClient, msg, support } from "./common";

describe("command:forcescore", function () {
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.createMessage).to.not.have.been.called;
	});
	it("submits good scores", async () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		sinon.stub(support.database, "getConfirmedPlayer").resolves({ challongeId: 0, discordId: "", deck: "" });
		sinon.stub(support.challonge, "findClosedMatch").resolves({
			player1: 0,
			player2: 1,
			matchId: 0,
			open: true,
			round: 1
		});
		sinon.stub(support.discord, "getRESTUsername").resolves("nova#0000");
		await command.executor(msg, ["name", "2-1"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			"Score of 2-1 submitted in favour of <@nova> (nova#0000) in **Tournament 1**!"
		);
	});
	it("rejects bad scores", () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name", "they won"], support)).to.be.rejectedWith(
			"Must provide score in format `#-#` e.g. `2-1`."
		);
	});
});
