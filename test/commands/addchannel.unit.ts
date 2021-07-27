import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/addchannel";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:addchannel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"adds a public channel by default",
		test(async function (this: SinonSandbox) {
			msg.channel.createMessage = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channel.id,
				"public"
			);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "This channel added as a public announcement channel for **Tournament 1**!" })
			);
		})
	);
	it(
		"adds public channels",
		test(async function (this: SinonSandbox) {
			msg.channel.createMessage = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name", "public"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channel.id,
				"public"
			);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "This channel added as a public announcement channel for **Tournament 1**!" })
			);
		})
	);
	it(
		"adds private channels",
		test(async function (this: SinonSandbox) {
			msg.channel.createMessage = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name", "private"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channel.id,
				"private"
			);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				sinon.match({ content: "This channel added as a private announcement channel for **Tournament 1**!" })
			);
		})
	);
});
