import { expect } from "chai";
import { User } from "discord.js";
import sinon from "sinon";
import command from "../../src/commands/removehost";
import { itRejectsNonHosts, mockBotClient, msg, support } from "./common";

describe("command:removehost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("supports mentioned users", async () => {
		msg.mentions = [];
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name", "<@!snowflake>"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "<@snowflake> removed as a host for **Tournament 1**!" })
		);
	});
	it("supports user ids", async () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.send = sinon.spy();
		await command.executor(msg, ["name", "raw-snowflake"], support);
		expect(msg.channel.send).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "<@raw-snowflake> removed as a host for **Tournament 1**!" })
		);
	});
});
