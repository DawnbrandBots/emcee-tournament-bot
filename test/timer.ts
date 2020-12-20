import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import sinonTest from "sinon-test";
import { DiscordInterface } from "../src/discord/interface";
import { PersistentTimer } from "../src/timer";
import logger from "../src/util/logger";
import { DiscordWrapperMock } from "./mocks/discord";

chai.use(sinonChai);
const test = sinonTest(sinon);

const discordMock = new DiscordWrapperMock();
const discord = new DiscordInterface(discordMock, "mc!", logger);

describe.skip("PersistentTimer is a timer", function () {
	it(
		"initializes correctly",
		test(async function (this: typeof sinon) {
			// this.spy(Countdown);
			// this.stub(Countdown, save);
			const timer = await PersistentTimer.create(
				discord,
				new Date(Date.now() + 10000),
				"1234567890",
				"Test timer done",
				1000
			);
			expect(timer.isActive()).to.be.true;
			// expect save to have been called
			// expect sendMessage to have been called with
			// expect setInterval to have been called
		})
	);

	it("calls tick and finishes");
	it("can be aborted");
});

describe.skip("PersistentTimer is persisted", function () {
	// stub out Countdown.find
	// stub out getConnection transaction
	it("loads persisted timers and reinitializes");
	it("prunes expired timers");
});

describe("formatTime", function () {
	const tests = [
		{ name: "basic format", milli: 10 * 60 * 1000 + 10 * 1000, str: "10:10" },
		{ name: "zero pads", milli: 60 * 1000 + 1000, str: "01:01" },
		{ name: "works with zero", milli: 0, str: "00:00" },
		{ name: "ignores small fractions", milli: 1, str: "00:00" },
		{ name: "rounds correctly", milli: 1500, str: "00:01" }
	];

	for (const test of tests) {
		it(test.name, function () {
			expect(PersistentTimer.formatTime(test.milli)).to.equal(test.str);
		});
	}
});
