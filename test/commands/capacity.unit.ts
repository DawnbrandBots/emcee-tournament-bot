import { expect } from "chai";
import { SinonSandbox } from "sinon";
import command from "../../src/commands/capacity";
import { DatabaseTournament, TournamentFormat, TournamentStatus } from "../../src/database/interface";
import { ChallongeTournament } from "../../src/database/orm";
import { itRejectsNonHosts, msg, support, test } from "./common";

describe("command:capacity", function () {
	const tournament: DatabaseTournament = {
		name: "foo",
		limit: 16,
		// unused
		id: "",
		description: "",
		format: TournamentFormat.SWISS,
		status: TournamentStatus.PREPARING,
		hosts: [],
		players: [],
		publicChannels: [],
		privateChannels: [],
		server: "r",
		byes: [],
		findPlayer: () => undefined
	};
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("rejects badly formatted numbers", () => {
		const error = "The second parameter (tournament capacity) must be a whole number!";
		for (const example of [
			"1.1",
			"4000.56",
			"0x2",
			"0xB",
			"02",
			"007",
			"ab",
			"fourteen",
			"-2",
			"-54.3",
			"10 000",
			"20,000"
		]) {
			expect(command.executor(msg, ["name", example], support)).to.be.rejectedWith(error);
		}
	});
	it(
		"returns the participant limit",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "authenticateHost").resolves(tournament);
			msg.reply = this.spy();
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(`**foo** capacity: _16_`);
		})
	);
	it(
		"returns 0 capacity as 256",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "authenticateHost").resolves({
				...tournament,
				limit: 0
			});
			msg.reply = this.spy();
			await command.executor(msg, ["name"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(`**foo** capacity: _256_`);
		})
	);
	it(
		"sets the participant limit",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "authenticateHost").resolves(tournament);
			this.stub(ChallongeTournament, "createQueryBuilder").returns({
				update: () => ({
					set: () => ({
						where: () => ({
							execute: () => undefined
						})
					})
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
			msg.reply = this.spy();
			await command.executor(msg, ["name", "32"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(`Set the capacity for **foo** to _32_.`);
		})
	);
	it(
		"treats oversized limits as zero",
		test(async function (this: SinonSandbox) {
			this.stub(support.database, "authenticateHost").resolves(tournament);
			this.stub(ChallongeTournament, "createQueryBuilder").returns({
				update: () => ({
					set: () => ({
						where: () => ({
							execute: () => undefined
						})
					})
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
			msg.reply = this.spy();
			await command.executor(msg, ["name", "512"], support);
			expect(msg.reply).to.have.been.calledOnceWithExactly(`Set the capacity for **foo** to _0_.`);
		})
	);
});
