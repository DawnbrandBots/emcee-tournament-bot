import { expect } from "chai";
import { User } from "discord.js";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/forcescore";
import { mockBotClient, msg, support, test } from "./common";

describe("command:forcescore", function () {
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.send = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.send).to.not.have.been.called;
	});
	it(
		"submits good scores",
		test(async function (this: SinonSandbox) {
			msg.mentions = [new User({ id: "nova" }, mockBotClient)];
			msg.channel.send = sinon.spy();
			this.stub(support.database, "getConfirmedPlayer").resolves({ challongeId: 0, discordId: "", deck: "" });
			this.stub(support.challonge, "findClosedMatch").resolves({
				player1: 0,
				player2: 1,
				matchId: 0,
				open: true,
				round: 1
			});
			this.stub(support.discord, "getRESTUsername").resolves("nova#0000");
			await command.executor(msg, ["name", "2-1"], support);
			expect(msg.channel.send).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "Score of 2-1 submitted in favour of <@nova> (nova#0000) in **Tournament 1**!" })
			);
		})
	);
	it("rejects bad scores", () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.send = sinon.spy();
		expect(command.executor(msg, ["name", "they won"], support)).to.be.rejectedWith(
			"Must provide score in format `#-#` e.g. `2-1`."
		);
	});
});
