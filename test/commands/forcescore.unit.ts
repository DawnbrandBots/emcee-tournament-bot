import { expect } from "chai";
import { MessageMentions } from "discord.js";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/forcescore";
import { findClosedMatch } from "../../src/util/challonge";
import { msg, support, test } from "./common";

describe("command:forcescore", function () {
	it(
		"requires a mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(msg, [], [], false);
			this.stub(msg, "reply").resolves();
			expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
			expect(msg.reply).to.not.have.been.called;
		})
	);
	it(
		"submits good scores",
		test(async function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(
				msg,
				[{ id: "nova", username: "K", discriminator: "0000", avatar: "k.png" }],
				[],
				false
			);
			this.stub(msg, "reply").resolves();
			this.stub(support.database, "getConfirmedPlayer").resolves({ challongeId: 0, discordId: "", deck: "" });
			this.stub(findClosedMatch).resolves({
				player1: 0,
				player2: 1,
				matchId: 0,
				open: true,
				round: 1
			});
			await command.executor(msg, ["name", "2-1"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"Score of 2-1 submitted in favour of <@nova> (K#0000) in **Tournament 1**!"
			);
		})
	);
	it(
		"rejects bad scores",
		test(function (this: SinonSandbox) {
			msg.mentions = new MessageMentions(
				msg,
				[{ id: "nova", username: "K", discriminator: "0000", avatar: "k.png" }],
				[],
				false
			);
			this.stub(msg, "reply").resolves();
			expect(command.executor(msg, ["name", "they won"], support)).to.be.rejectedWith(
				"Must provide score in format `#-#` e.g. `2-1`."
			);
		})
	);
});
