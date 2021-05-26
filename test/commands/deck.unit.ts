import { expect } from "chai";
import dotenv from "dotenv";
import { User } from "eris";
import sinon, { SinonSandbox } from "sinon";
import { Deck } from "ydeck";
import command from "../../src/commands/deck";
import { itRejectsNonHosts, mockBotClient, msg, support, test } from "./common";

const sampleDeck = new Deck(new Map(), {
	ydk:
		"#created by YDeck\n#main\n99249638\n99249638\n46659709\n46659709\n46659709\n65367484\n65367484\n65367484\n43147039\n30012506\n30012506\n30012506\n77411244\n77411244\n77411244\n3405259\n3405259\n3405259\n89132148\n39890958\n14558127\n14558127\n14558127\n32807846\n73628505\n12524259\n12524259\n12524259\n24224830\n80352158\n80352158\n80352158\n66399653\n66399653\n66399653\n10045474\n10045474\n10045474\n55784832\n55784832\n#extra\n1561110\n10443957\n10443957\n58069384\n58069384\n73289035\n581014\n21887175\n4280258\n38342335\n2857636\n75452921\n50588353\n83152482\n65741786\n!side\n43147039\n"
});

dotenv.config();

describe("command:deck", function () {
	itRejectsNonHosts(support, command, msg, ["name"]);
	it("requires a mentioned user", async () => {
		msg.mentions = [];
		msg.channel.createMessage = sinon.spy();
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("Message does not mention a user!");
		expect(msg.channel.createMessage).to.not.have.been.called;
	});
	it(
		"retrieves the deck for the mentioned user",
		test(async function (this: SinonSandbox) {
			msg.mentions = [new User({ id: "nova" }, mockBotClient)];
			const replySpy = (msg.channel.createMessage = this.spy());
			this.stub(support.database, "getConfirmedPlayer").resolves({
				challongeId: 0,
				deck: sampleDeck.url,
				discordId: "nova"
			});
			this.stub(support.decks, "getDeck").returns(sampleDeck);
			await command.executor(msg, ["name"], support);
			expect(msg.channel.createMessage).to.have.been.calledOnce;
			expect(support.database.getConfirmedPlayer).to.have.been.calledOnceWithExactly("nova", "name");
			expect(support.decks.getDeck).to.have.been.calledOnceWithExactly(sampleDeck.url);
			expect(replySpy.args[0][1].name).to.equal("nova.ydk");
			expect(replySpy.args[0][1].file).to.equal(sampleDeck.ydk);
		})
	);
});
