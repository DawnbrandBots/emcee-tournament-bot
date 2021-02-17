import chai, { expect } from "chai";
import proxyquire from "proxyquire";
import sinon, { SinonSandbox } from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";

chai.use(sinonChai);
const test = sinonTest(sinon);
proxyquire.noPreserveCache();

// The external dependencies that we specifically mock out.
const send = sinon.stub().resolves("testId");
const edit = sinon.spy();
const discordDelegateMock = {
	sendMessage: send,
	editMessage: edit
};
const countdownEntityStub = {
	save: sinon.stub(),
	remove: sinon.stub()
};
const Countdown = sinon.stub().returns(countdownEntityStub);
const { PersistentTimer } = proxyquire("../src/timer", {
	"./database/orm": { Countdown }
});
// The strong disadvantage of the proxyquire approach is that we lose all type-safety in tests.
// Therefore I would not recommend it for other tests, especially if they get more complex than this.

describe("PersistentTimer is a timer", function () {
	// Ensures that each test does not affect the other when they use the same mocks declared above.
	beforeEach(function () {
		sinon.resetHistory();
	});

	it(
		"initializes correctly",
		test(async function (this: SinonSandbox) {
			const timer = await PersistentTimer.create(
				discordDelegateMock,
				new Date(Date.now() + 10000),
				"1234567890",
				"Test timer done",
				5
			);
			expect(timer.isActive()).to.be.true;
			expect(send).to.have.been.calledWith("1234567890", "Time left in the round: `00:10`");
			expect(Countdown).to.have.been.called;
			expect(countdownEntityStub.save).to.have.been.called;
			expect(send).to.have.been.calledBefore(countdownEntityStub.save);
		})
	);

	it(
		"calls tick and finishes",
		test(async function (this: SinonSandbox) {
			const timer = await PersistentTimer.create(
				discordDelegateMock,
				new Date(Date.now() + 15000),
				"1234567890",
				"Test timer done",
				5
			);
			// Tick should be every second
			await this.clock.tickAsync(500);
			expect(edit).to.not.have.been.called;
			// First tick
			await this.clock.tickAsync(4500);
			expect(edit).to.have.been.calledOnceWith("1234567890", "testId", "Time left in the round: `00:10`");
			// Second tick
			await this.clock.tickAsync(5000);
			expect(edit).to.have.been.calledTwice;
			expect(edit).to.have.been.calledWith("1234567890", "testId", "Time left in the round: `00:05`");
			// Third tick, we should be finished
			await this.clock.tickAsync(5000);
			expect(edit).to.have.been.calledThrice;
			expect(edit).to.have.been.calledWith("1234567890", "testId", "Time left in the round: `00:00`");
			expect(send).to.have.been.calledWith("1234567890", "Test timer done");
			expect(countdownEntityStub.remove).to.have.been.called;
			// Nothing else should happen now
			await this.clock.runAllAsync();
			expect(edit).to.have.been.calledThrice;
			expect(countdownEntityStub.remove).to.have.been.calledOnce.and.calledOn(countdownEntityStub);
			expect(timer.isActive()).to.be.false;
		})
	);

	it(
		"can be aborted",
		test(async function (this: SinonSandbox) {
			const timer = await PersistentTimer.create(
				discordDelegateMock,
				new Date(Date.now() + 3000),
				"1234567890",
				"Test timer done",
				1
			);
			// First tick
			await this.clock.tickAsync(1000);
			expect(edit).to.have.been.calledOnce;
			// Abort
			await timer.abort();
			expect(countdownEntityStub.remove).to.have.been.calledOnce.and.calledOn(countdownEntityStub);
			// Nothing else should happen
			await this.clock.runAllAsync();
			expect(edit).to.have.been.calledOnce;
			// No final message sent
			expect(send).to.have.been.calledOnce;
		})
	);
});

describe("PersistentTimer is persisted", function () {
	// stub out Countdown.find
	// stub out getConnection transaction
	it("loads persisted timers and reinitializes");
	it("prunes expired timers");
});
