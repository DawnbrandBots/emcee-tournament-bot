import { expect } from "chai";
import { MessageMentions } from "discord.js";
import sinon from "sinon";
import command from "../../src/commands/removehost";
import { itRejectsNonHosts, msg, support } from "./common";

describe("command:removehost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("supports mentioned users", async () => {
		msg.mentions = new MessageMentions(msg, [], [], false);
		msg.reply = sinon.spy();
		await command.executor(msg, ["name", "<@!snowflake>"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly("<@snowflake> removed as a host for **Tournament 1**!");
	});
	it("supports user ids", async () => {
		msg.mentions = new MessageMentions(
			msg,
			[{ id: "nova", username: "K", discriminator: "0000", avatar: "k.png" }],
			[],
			false
		);
		msg.reply = sinon.spy();
		await command.executor(msg, ["name", "raw-snowflake"], support);
		expect(msg.reply).to.have.been.calledOnceWithExactly(
			"<@raw-snowflake> removed as a host for **Tournament 1**!"
		);
	});
});
