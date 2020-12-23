import chai, { expect } from "chai";
import proxyquire from "proxyquire";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { DiscordInterface } from "../src/discord/interface";
import logger from "../src/util/logger";
import { DiscordWrapperMock } from "./mocks/discord";

chai.use(sinonChai);
const test = sinonTest(sinon);
proxyquire.noPreserveCache();

const discordMock = new DiscordWrapperMock();
const discord = new DiscordInterface(discordMock, "mc!", logger);

// This could also be in a before call as needed
const countdownEntityStub = {
	save: sinon.stub(),
	remove: sinon.stub()
};
const Countdown = sinon.stub().returns(countdownEntityStub);
const { PersistentTimer } = proxyquire("../src/timer", {
	"./database/orm": { Countdown }
});

const gsi = setInterval;
describe("PersistentTimer is a timer", function () {
	it(
		"initializes correctly",
		test(async function (this: SinonSandbox) {
			const sendMessageSpy = this.spy(discord, "sendMessage"); // TODO: replace when we mock Discord the same way
			const timer = await PersistentTimer.create(
				discord,
				new Date(Date.now() + 10000),
				"1234567890",
				"Test timer done",
				1000
			);
			expect(timer.isActive()).to.be.true;
			expect(sendMessageSpy).to.have.been.calledWith("1234567890", "Time left in the round: `00:10`");
			expect(Countdown).to.have.been.called;
			expect(countdownEntityStub.save).to.have.been.called;
			expect(sendMessageSpy).to.have.been.calledBefore(countdownEntityStub.save);
		})
	);

	it(
		"calls tick and finishes",
		test(async function (this: SinonSandbox) {
			const sendMessageSpy = this.spy(discord, "sendMessage"); // TODO: replace when we mock Discord the same way
			const edit = this.stub();
			const getMessageStub = this.stub(discord, "getMessage").returns(
				Promise.resolve({
					id: "",
					content: "",
					attachments: [],
					author: "",
					channelId: "",
					serverId: "",
					reply: this.stub(),
					react: this.stub(),
					edit
				})
			);
			const timer = await PersistentTimer.create(
				discord,
				new Date(Date.now() + 3000),
				"1234567890",
				"Test timer done",
				1000
			);
			await this.clock.tickAsync(500);
			expect(edit).to.not.have.been.called;
			await this.clock.tickAsync(500);
			expect(edit).to.have.been.calledOnceWith("Time left in the round: `00:02`");
			await this.clock.tickAsync(1000);
			expect(edit).to.have.been.calledTwice;
			expect(edit).to.have.been.calledWith("Time left in the round: `00:01`");
			await this.clock.tickAsync(1000);
			expect(edit).to.have.been.calledThrice;
			expect(edit).to.have.been.calledWith("Time left in the round: `00:00`");
			expect(sendMessageSpy).to.have.been.calledWith("1234567890", "Test timer done");
			expect(countdownEntityStub.remove).to.have.been.called;
			await this.clock.runAllAsync();
			expect(edit).to.have.been.calledThrice;
			expect(countdownEntityStub.remove).to.have.been.calledOn(countdownEntityStub).calledOnce;
			// This message id is from the "mock" DiscordWrapper. We would use a stub otherwise.
			expect(getMessageStub).to.have.been.calledWithExactly("1234567890", "testId");
		})
	);

	it("can be aborted");

	after(() => {
		if (gsi !== setInterval) {
			throw setInterval;
		}
	});
});

describe("PersistentTimer is persisted", function () {
	// stub out Countdown.find
	// stub out getConnection transaction
	it("loads persisted timers and reinitializes");
	it("prunes expired timers");
});
