import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command from "../../src/commands/score";
import { TournamentStatus } from "../../src/database/interface";
import { msg, support, test } from "./common";

describe("command:score", function () {
	it(
		"rejects non-players",
		test(function (this: SinonSandbox) {
			const replySpy = (msg.channel.createMessage = sinon.spy());
			const authStub = this.stub(support.database, "authenticatePlayer").rejects();
			expect(command.executor(msg, ["name", "2-0"], support)).to.be.rejected;
			expect(authStub).to.have.been.calledOnceWithExactly("name", "0000", undefined, TournamentStatus.IPR);
			expect(replySpy).to.not.have.been.called;
		})
	);
	it("rejects bad scores", () => {
		expect(command.executor(msg, ["name", "i won"], support)).to.be.rejectedWith(
			"Must provide score in format `#-#` e.g. `2-1`."
		);
	});
	it("submits good scores", async () => {
		sinon.restore();
		const replySpy = (msg.channel.createMessage = sinon.spy());
		sinon.stub(support.database, "authenticatePlayer").callsFake(async (_, id) => ({
			challongeId: id === "0000" ? 0 : 1,
			tournament: {
				name: "foo",
				privateChannels: ["123"]
			}
		}));
		sinon.stub(support.challonge, "findMatch").resolves({
			player1: 0,
			player2: 1,
			matchId: 0,
			open: true,
			round: 1
		});
		sinon.stub(support.discord, "sendDirectMessage").resolves();
		sinon.stub(support.discord, "sendMessage").resolves();
		sinon.stub(support.discord, "getRESTUsername").resolves("nova#0000");

		await command.executor(msg, ["name", "2-1"], support);
		expect(replySpy).to.have.been.calledOnceWithExactly(
			"You have reported a score of 2-1, <@0000>. Your opponent still needs to confirm this score. If you want to drop, please wait for your opponent to confirm or you will concede 0-2."
		);

		msg.author.id = "zeus";
		await command.executor(msg, ["name", "2-1"], support);
		expect(replySpy).to.have.been.calledWith(
			"Your score does not match your opponent's reported score of 1-2. Both of you will need to report again, <@zeus>."
		);

		replySpy.resetHistory();
		msg.author.id = "0000";
		await command.executor(msg, ["name", "2-1"], support);
		expect(replySpy).to.have.been.calledOnceWithExactly(
			"You have reported a score of 2-1, <@0000>. Your opponent still needs to confirm this score. If you want to drop, please wait for your opponent to confirm or you will concede 0-2."
		);

		msg.author.id = "zeus";
		await command.executor(msg, ["name", "1-2"], support);
		expect(replySpy).to.have.been.calledWith(
			"You have successfully reported a score of 1-2, and it matches your opponent's report, so the score has been saved. Thank you, <@zeus>."
		);
		expect(support.discord.sendDirectMessage).to.have.been.calledOnceWithExactly(
			"0000",
			"Your opponent has successfully confirmed your score of 2-1 for **foo**, so the score has been saved. Thank you."
		);
		expect(support.discord.sendMessage).to.have.been.calledOnceWithExactly(
			"123",
			"<@zeus> (nova#0000) and <@0000> (nova#0000) have reported their score of 1-2 for **foo** (name)."
		);
	});
});
