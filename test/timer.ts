import { expect } from "chai";
import { PersistentTimer } from "../src/timer";

describe.skip("PersistentTimer is a timer", function () {
	undefined;
});

describe.skip("PersistentTimer is persisted", function () {
	undefined;
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
