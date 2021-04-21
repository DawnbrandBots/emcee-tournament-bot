import { expect } from "chai";
import { User } from "eris";
import sinon from "sinon";
import command from "../../src/commands/removehost";
import { itRejectsNonHosts, mockBotClient, msg, support } from "./common";

describe("command:removehost", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("supports mentioned users", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "<@!snowflake>"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "<@snowflake> removed as a host for Tournament name!" })
		);
	});
	it("supports user ids", async () => {
		msg.mentions = [new User({ id: "nova" }, mockBotClient)];
		msg.channel.createMessage = sinon.spy();
		await command.executor(msg, ["name", "raw-snowflake"], support);
		expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
			sinon.match({ content: "<@raw-snowflake> removed as a host for Tournament name!" })
		);
	});
});
