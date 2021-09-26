import chai, { expect } from "chai";
import { Client, Message } from "discord.js";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { Command, CommandDefinition, CommandSupport } from "../src/Command";
import { DeckManager } from "../src/deck";
import { OrganiserRoleProvider } from "../src/role/organiser";
import { ParticipantRoleProvider } from "../src/role/participant";
import { Templater } from "../src/templates";
import { TimeWizard } from "../src/timer";
import { UserError } from "../src/util/errors";
import { WebsiteInterface } from "../src/website/interface";
import { DatabaseWrapperMock } from "./mocks/database";
import { TournamentMock } from "./mocks/tournament";
import { WebsiteWrapperMock } from "./mocks/website";

chai.use(sinonChai);
const test = sinonTest(sinon);

describe("Command class", function () {
	const support: CommandSupport = {
		tournamentManager: new TournamentMock(),
		organiserRole: new OrganiserRoleProvider("MC-TO"),
		// UNUSED
		database: new DatabaseWrapperMock(),
		challonge: new WebsiteInterface(new WebsiteWrapperMock()),
		scores: new Map(),
		decks: new DeckManager(new Map()),
		participantRole: new ParticipantRoleProvider(new Client({ intents: [] })),
		templater: new Templater(),
		timeWizard: new TimeWizard({
			sendMessage: sinon.stub(),
			editMessage: sinon.stub()
		})
	};
	const msg = new Message(new Client({ intents: [] }), {
		id: "007",
		channel_id: "foo",
		author: { id: "0000", username: "K", discriminator: "1234", avatar: "k.png" },
		content: ".",
		timestamp: "1",
		edited_timestamp: "1",
		tts: false,
		mention_everyone: false,
		mentions: [],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: 0
	});
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
			const replySpy = this.stub(msg, "reply").resolves();
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
				expect(msg.reply).to.have.been.calledOnceWithExactly(usage);
				expect(execStub).to.not.have.been.called;
				replySpy.resetHistory();
			}
			const successes = [
				["one", "two"],
				["one", "two", "three"]
			];
			for (const args of successes) {
				await command.run(msg, args, support);
				expect(msg.reply).to.not.have.been.called;
				expect(execStub).to.have.been.calledOnceWithExactly(msg, args, support);
				execStub.resetHistory();
			}
		})
	);
	it(
		"informs the user of errors",
		test(async function (this: SinonSandbox) {
			this.stub(msg, "reply").resolves();
			await command.run(msg, ["fail", "user"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly("induced-user");
		})
	);
	it(
		"absorbs and logs all errors",
		test(async function (this: SinonSandbox) {
			this.stub(msg, "reply").resolves();
			await command.run(msg, [], support);
			expect(msg.reply).to.have.been.calledOnce;
			await command.run(msg, ["fail", "user"], support);
			expect(msg.reply).to.have.been.calledTwice;
			await command.run(msg, ["fail", "other"], support);
			expect(msg.reply).to.have.been.calledTwice;
		})
	);
});
