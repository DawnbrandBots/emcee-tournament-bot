import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import command, { createTournamentEmbed } from "../../src/commands/info";
import { TournamentFormat, TournamentStatus } from "../../src/database/interface";
import { ChallongeTournament, ConfirmedParticipant } from "../../src/database/orm";
import { msg, support, test } from "./common";

function makeTournament(): ChallongeTournament {
	const tournament = new ChallongeTournament();
	tournament.tournamentId = "users/EmceeDiscordBot";
	tournament.name = "Drive Your Fire";
	tournament.description = "Thrash out against the ignorance of others, it is not a flame hot enough!";
	tournament.owningDiscordServer = "unused";
	tournament.format = TournamentFormat.SWISS;
	tournament.hosts = ["A-ONE"];
	tournament.status = TournamentStatus.PREPARING;
	tournament.participantLimit = 0;
	tournament.confirmed = [];
	return tournament;
}

describe("createTournamentEmbed", function () {
	it("returns an embed", () => {
		const tournament = makeTournament();
		const embed = createTournamentEmbed(tournament);
		expect(embed).to.deep.equal({
			title: "**Drive Your Fire**",
			description: "Thrash out against the ignorance of others, it is not a flame hot enough!",
			url: "https://challonge.com/users/EmceeDiscordBot",
			fields: [
				{
					inline: true,
					name: ":ticket: Capacity",
					value: "256"
				},
				{
					inline: true,
					name: ":tickets: Registered",
					value: "**0** participants"
				},
				{
					inline: true,
					name: ":notepad_spiral: Format",
					value: "swiss"
				},
				{
					inline: true,
					name: ":hourglass: Status",
					value: "preparing"
				},
				{
					inline: true,
					name: ":smile: Hosts",
					value: "<@A-ONE>"
				}
			],
			footer: {
				text: "Tournament details as of request time"
			}
		});
	});
	it("shows byes only when needed", () => {
		function p(discordId: string): ConfirmedParticipant {
			const participant = new ConfirmedParticipant();
			participant.discordId = discordId;
			participant.hasBye = true;
			return participant;
		}
		const tournament = makeTournament();
		tournament.hosts = ["A-ONE", "Rute", "Aki"];
		tournament.confirmed = [p("Yusei"), p("Jack"), p("Crow"), p("Aki"), p("Ruka"), p("Rua")];
		const embed = createTournamentEmbed(tournament);
		expect(embed).to.deep.equal({
			title: "**Drive Your Fire**",
			description: "Thrash out against the ignorance of others, it is not a flame hot enough!",
			url: "https://challonge.com/users/EmceeDiscordBot",
			fields: [
				{
					inline: true,
					name: ":ticket: Capacity",
					value: "256"
				},
				{
					inline: true,
					name: ":tickets: Registered",
					value: "**6** participants"
				},
				{
					inline: true,
					name: ":notepad_spiral: Format",
					value: "swiss"
				},
				{
					inline: true,
					name: ":hourglass: Status",
					value: "preparing"
				},
				{
					inline: true,
					name: ":sunglasses: Round 1 byes",
					value: "<@Yusei> <@Jack> <@Crow> <@Aki> <@Ruka> <@Rua>"
				},
				{
					inline: true,
					name: ":smile: Hosts",
					value: "<@A-ONE> <@Rute> <@Aki>"
				}
			],
			footer: {
				text: "Tournament details as of request time"
			}
		});
	});
});

describe("command:info", function () {
	it("must be used in a server", () => {
		expect(command.executor(msg, ["name"], support)).to.be.rejectedWith("This can only be used in a server!");
	});
	it(
		"responds if no match is found",
		test(async function (this: SinonSandbox) {
			const findStub = this.stub(ChallongeTournament, "findOne");
			msg.channel.createMessage = this.spy();
			msg.guildID = "foo";
			await command.executor(msg, ["name"], support);
			expect(findStub).to.have.been.calledOnceWithExactly({ tournamentId: "name", owningDiscordServer: "foo" });
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(
				sinon.match({
					content: "No matching tournament in this server."
				})
			);
		})
	);
	it(
		"displays an embed if found",
		test(async function (this: SinonSandbox) {
			const findStub = this.stub(ChallongeTournament, "findOne").resolves(makeTournament());
			msg.channel.createMessage = this.spy();
			msg.guildID = "foo";
			await command.executor(msg, ["name"], support);
			expect(findStub).to.have.been.calledOnce; // same as above
			expect(msg.channel.createMessage).to.have.been.calledOnceWithExactly(sinon.match({ embed: {} }));
		})
	);
});
