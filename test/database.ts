import { expect } from "chai";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "testcontainers";
import { initializeConnection, ManualDeckSubmission, ManualParticipant, ManualTournament } from "../src/database/orm";

describe("Entities for manual tournaments", () => {
	let container: StartedPostgreSqlContainer;

	before(async () => {
		container = await new PostgreSqlContainer("postgres:13-alpine").start();
		await initializeConnection(
			`postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`
		);
	});

	it("creates ManualTournament", async () => {
		const tournament = new ManualTournament();
		tournament.name = "Test tournament";
		tournament.description = "";
		tournament.owningDiscordServer = "0";
		tournament.participantRole = "0";
		tournament.requireFriendCode = true;
		await tournament.save();
		expect(tournament.tournamentId).to.be.greaterThan(0);
	});

	it("adds ManualParticipant to ManualTournament", async () => {
		const tournament = await ManualTournament.findOneByOrFail({});
		const participant = new ManualParticipant();
		participant.tournament = tournament;
		participant.discordId = "0";
		await participant.save();
		expect(participant.tournamentId).to.be.greaterThan(0);
		expect(participant.dropped).to.be.false;
	});

	it("adds DeckSubmission for ManualParticipant", async () => {
		const participant = await ManualParticipant.findOneByOrFail({});
		const deck = new ManualDeckSubmission();
		deck.participant = participant;
		deck.content = "foo";
		await deck.save();
		expect(deck.tournamentId).to.be.greaterThan(0);
		expect(deck.discordId).to.be.equal("0");
		expect(deck.approved).to.be.false;
	});

	after(async () => {
		await container.stop();
	});
});
