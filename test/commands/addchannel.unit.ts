import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/addchannel";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:addchannel", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it(
		"adds a public channel by default",
		test(async function (this: SinonSandbox) {
			msg.reply = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channelId,
				"public"
			);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"This channel added as a public announcement channel for **Tournament 1**!"
			);
		})
	);
	it(
		"adds public channels",
		test(async function (this: SinonSandbox) {
			msg.reply = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name", "public"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channelId,
				"public"
			);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"This channel added as a public announcement channel for **Tournament 1**!"
			);
		})
	);
	it(
		"adds private channels",
		test(async function (this: SinonSandbox) {
			msg.reply = this.spy();
			this.stub(support.database, "addAnnouncementChannel");
			await command.executor(msg, ["name", "private"], support);
			expect(support.database.addAnnouncementChannel).to.have.been.calledOnceWithExactly(
				"name",
				msg.channelId,
				"private"
			);
			expect(msg.reply).to.have.been.calledOnceWithExactly(
				"This channel added as a private announcement channel for **Tournament 1**!"
			);
		})
	);
});
