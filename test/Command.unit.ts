import chai, { expect } from "chai";
import { Client, Message } from "eris";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { Command, CommandDefinition, CommandSupport } from "../src/Command";
import { DiscordInterface } from "../src/discord/interface";
import { OrganiserRoleProvider } from "../src/role/organiser";
import { UserError } from "../src/util/errors";
import { WebsiteInterface } from "../src/website/interface";
import { DatabaseWrapperMock } from "./mocks/database";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";
import { WebsiteWrapperMock } from "./mocks/website";

chai.use(sinonChai);
const test = sinonTest(sinon);

describe("Command class", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO"),
		// UNUSED
		database: new DatabaseWrapperMock(),
		challonge: new WebsiteInterface(new WebsiteWrapperMock()),
		scores: new Map()
	};
	const msg = new Message({ id: "007", channel_id: "foo", author: { id: "0000" } }, new Client("mock"));
	const testCommand: CommandDefinition = {
		name: "test",
		requiredArgs: ["unused", "failmode"],
		executor: async (_msg, args) => {
			const [, failmode] = args;
			if (failmode === "user") {
				throw new UserError("induced-user");
			} else if (failmode === "other") {
				throw new Error("induced");
			}
		}
	};
	const command = new Command(testCommand);
	// Instead the loops could be outside of it so this counts as multiple tests
	it(
		"checks command usage and runs the command",
		test(async function (this: SinonSandbox) {
			const replySpy = this.spy();
			msg.channel.createMessage = replySpy;
			const execStub = this.stub(testCommand, "executor");
			const usage = "Usage: test unused|failmode";
			const fails = [
				[],
				["one"],
				["", ""],
				["", "blank"],
				["blank", ""],
				["", "", ""],
				["", "blank", ""],
				["blank", "blank", ""],
				["blank", "", "blank"]
			];
			for (const args of fails) {
				await command.run(msg, args, support);
				expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(usage);
				expect(execStub).to.not.have.been.called;
				replySpy.resetHistory();
			}
			const successes = [
				["one", "two"],
				["one", "two", "three"]
			];
			for (const args of successes) {
				await command.run(msg, args, support);
				expect(msg.channel.createMessage).to.not.have.been.called;
				expect(execStub).to.have.been.calledOnceWithExactly(msg, args, support);
				execStub.resetHistory();
			}
		})
	);
	it(
		"informs the user of errors",
		test(async function (this: SinonSandbox) {
			msg.channel.createMessage = this.spy();
			await command.run(msg, ["fail", "user"], support);
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly("induced-user");
		})
	);
	it(
		"absorbs and logs all errors",
		test(async function (this: SinonSandbox) {
			msg.channel.createMessage = this.stub().rejects();
			await command.run(msg, [], support);
			expect(msg.channel.createMessage).to.have.been.calledOnce;
			await command.run(msg, ["fail", "user"], support);
			expect(msg.channel.createMessage).to.have.been.calledTwice;
			await command.run(msg, ["fail", "other"], support);
			expect(msg.channel.createMessage).to.have.been.calledTwice;
		})
	);
});
