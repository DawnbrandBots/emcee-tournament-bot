import chai, { expect } from "chai";
import proxyquire from "proxyquire";
import sinon from "sinon";
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

const countdownEntityStub = {
	save: sinon.stub()
};
const Countdown = sinon.stub().returns(countdownEntityStub);
const { PersistentTimer } = proxyquire("../src/timer", {
	"./database/orm": { Countdown }
});

describe("PersistentTimer is a timer", function () {
	it(
		"initializes correctly",
		test(async function (this: typeof sinon) {
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
			// expect setInterval to have been called
		})
	);

	it("calls tick and finishes");
	it("can be aborted");
});

describe("PersistentTimer is persisted", function () {
	// stub out Countdown.find
	// stub out getConnection transaction
	it("loads persisted timers and reinitializes");
	it("prunes expired timers");
});
