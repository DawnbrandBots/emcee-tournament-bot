import chai, { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { Command, CommandDefinition, CommandSupport } from "../src/Command";
import { DiscordInterface, DiscordMessageIn } from "../src/discord/interface";
import { UserError } from "../src/util/errors";
import { DiscordWrapperMock } from "./mocks/discord";
import { TournamentMock } from "./mocks/tournament";

chai.use(sinonChai);
const test = sinonTest(sinon);
void expect;

describe("Command class", function () {
	const support: CommandSupport = {
		discord: new DiscordInterface(new DiscordWrapperMock()),
		tournamentManager: new TournamentMock()
	};
	const msg: DiscordMessageIn = {
		id: "007",
		content: "irrelevant",
		attachments: [],
		author: "creator",
		channelId: "four",
		serverId: "six",
		reply: async () => void 0,
		react: async () => void 0,
		edit: async () => void 0
	};
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
			const replySpy = this.spy(msg, "reply");
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
				expect(replySpy).to.have.been.calledOnceWithExactly(usage);
				expect(execStub).to.not.have.been.called;
				replySpy.resetHistory();
			}
			const successes = [
				["one", "two"],
				["one", "two", "three"]
			];
			for (const args of successes) {
				await command.run(msg, args, support);
				expect(replySpy).to.not.have.been.called;
				expect(execStub).to.have.been.calledOnceWithExactly(msg, args, support);
				execStub.resetHistory();
			}
		})
	);
	it(
		"informs the user of errors",
		test(async function (this: SinonSandbox) {
			const replySpy = this.spy(msg, "reply");
			await command.run(msg, ["fail", "user"], support);
			expect(replySpy).to.have.been.calledOnceWithExactly("induced-user");
		})
	);
	it(
		"absorbs and logs all errors",
		test(async function (this: SinonSandbox) {
			const replyStub = this.stub(msg, "reply").rejects();
			await command.run(msg, [], support);
			expect(replyStub).to.have.been.calledOnce;
			await command.run(msg, ["fail", "user"], support);
			expect(replyStub).to.have.been.calledTwice;
			await command.run(msg, ["fail", "other"], support);
			expect(replyStub).to.have.been.calledTwice;
		})
	);
});
