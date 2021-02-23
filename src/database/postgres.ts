import { getConnection, IsNull, Not } from "typeorm";
import {
	AssertStatusError,
	TournamentNotFoundError,
	UnauthorisedHostError,
	UnauthorisedPlayerError,
	UserError
} from "../util/errors";
import { getLogger } from "../util/logger";
import {
	DatabaseMessage,
	DatabasePlayer,
	DatabasePlayerWithTournament,
	DatabaseTournament,
	SynchroniseTournament,
	TournamentStatus
} from "./interface";
import { ChallongeTournament, ConfirmedParticipant, initializeConnection, Participant, RegisterMessage } from "./orm";

const logger = getLogger("postgres");

export class DatabaseWrapperPostgres {
	private wrap(tournament: ChallongeTournament): DatabaseTournament {
		return {
			id: tournament.tournamentId,
			name: tournament.name,
			description: tournament.description,
			status: tournament.status,
			hosts: tournament.hosts.slice(),
			players: tournament.confirmed.map(p => ({
				discordId: p.discordId,
				challongeId: p.challongeId,
				deck: p.deck
			})),
			publicChannels: tournament.publicChannels.slice(),
			privateChannels: tournament.privateChannels.slice(),
			server: tournament.owningDiscordServer,
			byes: tournament.confirmed.filter(p => p.hasBye).map(p => p.discordId),
			findPlayer: (id: string): DatabasePlayer => {
				const p = tournament.confirmed.find(p => p.discordId === id);
				if (!p) {
					throw new UnauthorisedPlayerError(id, tournament.tournamentId);
				}
				return {
					discordId: p.discordId,
					challongeId: p.challongeId,
					deck: p.deck
				};
			}
		};
	}

	async createTournament(
		hostId: string,
		serverId: string,
		tournamentId: string,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		const tournament = new ChallongeTournament();
		tournament.tournamentId = tournamentId;
		tournament.name = name;
		tournament.description = description;
		tournament.owningDiscordServer = serverId;
		tournament.hosts = [hostId];
		// This is known but TypeORM won't populate it as it wasn't part of the original query,
		// which means wrap would break since it assumes not null.
		tournament.confirmed = [];
		await tournament.save();
		return this.wrap(tournament);
	}

	// This wrapper is only needed because the exception class is part of the call signature
	private async findTournament(tournamentId: string, relations: string[] = []): Promise<ChallongeTournament> {
		try {
			return await ChallongeTournament.findOneOrFail(tournamentId, { relations });
		} catch (err) {
			throw new TournamentNotFoundError(tournamentId);
		}
	}

	// TODO: remove and replace with alternate implementation
	// This causes many unnecessary double queries
	public async authenticateHost(
		tournamentId: string,
		hostId: string,
		assertStatus?: TournamentStatus
	): Promise<DatabaseTournament> {
		const tournament = await this.findTournament(tournamentId);
		if (!tournament.hosts.includes(hostId)) {
			throw new UnauthorisedHostError(hostId, tournamentId);
		}
		if (assertStatus && tournament.status !== assertStatus) {
			throw new AssertStatusError(tournamentId, assertStatus, tournament.status);
		}
		return this.wrap(tournament);
	}

	// TODO: remove and replace with alternate implementation
	// This causes many unnecessary double queries
	public async authenticatePlayer(
		tournamentId: string,
		discordId: string,
		assertStatus?: TournamentStatus
	): Promise<DatabasePlayerWithTournament> {
		try {
			// eslint-disable-next-line no-var
			var participant = await ConfirmedParticipant.findOneOrFail(
				{ discordId, tournamentId },
				{ relations: ["tournament"] }
			);
		} catch {
			throw new UnauthorisedPlayerError(discordId, tournamentId);
		}
		if (assertStatus && participant.tournament.status !== assertStatus) {
			throw new AssertStatusError(tournamentId, assertStatus, participant.tournament.status);
		}
		return {
			challongeId: participant.challongeId,
			tournament: {
				name: participant.tournament.name,
				privateChannels: participant.tournament.privateChannels
			}
		};
	}

	async getTournament(tournamentId: string, assertStatus?: TournamentStatus): Promise<DatabaseTournament> {
		const tournament = await this.findTournament(tournamentId);
		if (assertStatus && tournament.status !== assertStatus) {
			throw new AssertStatusError(tournamentId, assertStatus, tournament.status);
		}
		return this.wrap(tournament);
	}

	async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== TournamentStatus.PREPARING) {
			throw new AssertStatusError(tournamentId, TournamentStatus.PREPARING, tournament.status);
		}
		tournament.name = name;
		tournament.description = desc;
		await tournament.save();
	}

	async addAnnouncementChannel(tournamentId: string, channelId: string, type: "public" | "private"): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		const channels = type === "public" ? tournament.publicChannels : tournament.privateChannels;
		if (channels.includes(channelId)) {
			throw new UserError(`Tournament ${tournamentId} already has Channel ${channelId} as a ${type} channel!`);
		}
		channels.push(channelId);
		await tournament.save();
	}

	async removeAnnouncementChannel(
		tournamentId: string,
		channelId: string,
		type: "public" | "private"
	): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		const channels = type === "public" ? tournament.publicChannels : tournament.privateChannels;
		const i = channels.indexOf(channelId);
		if (i < 0) {
			throw new UserError(
				`Channel ${channelId} is not a ${type} announcement channel for Tournament ${tournamentId}!`
			);
		}
		channels.splice(i, 1);
		await tournament.save();
	}

	async addHost(tournamentId: string, newHost: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.hosts.includes(newHost)) {
			throw new UserError(`Tournament ${tournamentId} already includes user ${newHost} as a host!`);
		}
		tournament.hosts.push(newHost);
		await tournament.save();
	}

	async removeHost(tournamentId: string, newHost: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.hosts.length < 2) {
			throw new UserError(`Tournament ${tournamentId} has too few hosts to remove one!`);
		}
		if (!tournament.hosts.includes(newHost)) {
			throw new UserError(`Tournament ${tournamentId} doesn't include user ${newHost} as a host!`);
		}
		const i = tournament.hosts.indexOf(newHost);
		// i < 0 is impossible by precondition
		tournament.hosts.splice(i, 1);
		await tournament.save();
	}

	async openRegistration(tournamentId: string, channelId: string, messageId: string): Promise<void> {
		const message = new RegisterMessage();
		message.tournamentId = tournamentId;
		message.channelId = channelId;
		message.messageId = messageId;
		await message.save();
	}

	async getRegisterMessages(tournamentId?: string): Promise<DatabaseMessage[]> {
		if (!tournamentId) {
			const messages = await RegisterMessage.find();
			return messages.map(m => ({
				channelId: m.channelId,
				messageId: m.messageId
			}));
		}
		const tournament = await this.findTournament(tournamentId, ["registerMessages"]);
		return tournament.registerMessages.map(m => ({
			channelId: m.channelId,
			messageId: m.messageId
		}));
	}

	async cleanRegistration(channelId: string, messageId: string): Promise<void> {
		const message = await RegisterMessage.findOne({ channelId, messageId });
		if (!message) {
			return; // failure is OK
		}
		await message.remove();
	}

	async getPendingTournaments(playerId: string): Promise<DatabaseTournament[]> {
		const list = await Participant.find({ discordId: playerId });
		return list.filter(p => !p.confirmed).map(p => this.wrap(p.tournament));
	}

	async getConfirmedTournaments(playerId: string): Promise<DatabaseTournament[]> {
		const list = await ConfirmedParticipant.find({ where: { discordId: playerId }, relations: ["tournament"] });
		return list.filter(p => p.tournament.status === TournamentStatus.PREPARING).map(p => this.wrap(p.tournament));
	}

	async addPendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		const message = await RegisterMessage.findOne({ channelId, messageId });
		if (!message || message.tournament.status !== TournamentStatus.PREPARING) {
			return;
		}
		if (!(await Participant.findOne({ tournamentId: message.tournamentId, discordId: playerId }))) {
			const participant = new Participant();
			participant.tournamentId = message.tournamentId;
			participant.discordId = playerId;
			await participant.save();
			return this.wrap(message.tournament);
		}
	}

	async removePendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		const message = await RegisterMessage.findOne({ channelId, messageId });
		if (!message || message.tournament.status !== TournamentStatus.PREPARING) {
			return;
		}
		const participant = await Participant.findOne({ tournamentId: message.tournamentId, discordId: playerId });
		if (participant && !participant.confirmed) {
			await participant.remove();
			return this.wrap(message.tournament);
		}
	}

	async removeConfirmedPlayerReaction(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		const message = await RegisterMessage.findOne({ channelId, messageId });
		if (!message) {
			return;
		}
		const participant = await Participant.findOne({
			tournamentId: message.tournamentId,
			discordId: playerId
		});
		if (participant?.confirmed) {
			await participant.remove();
			return this.wrap(message.tournament);
		}
	}

	async removeConfirmedPlayerForce(tournamentId: string, playerId: string): Promise<DatabaseTournament | undefined> {
		const participant = await Participant.findOne({ tournamentId, discordId: playerId });
		if (participant?.confirmed) {
			const tournament = participant.tournament;
			await participant.remove();
			return this.wrap(tournament);
		}
	}

	async startTournament(tournamentId: string): Promise<string[]> {
		logger.verbose(`startTournament: ${tournamentId}`);
		const tournament = await this.findTournament(tournamentId);
		logger.verbose(`startTournament: loaded ${tournamentId}`);
		const participants = await Participant.find({ tournamentId });
		logger.verbose(`startTournament: loaded ${participants.length} participants for ${tournamentId}`);
		const ejected = participants.filter(p => !p.confirmed);
		logger.verbose(`startTournament: filtered for unconfirmed participants`);
		await getConnection().transaction(async entityManager => {
			for (const p of ejected) {
				await entityManager.remove(p);
			}
			tournament.status = TournamentStatus.IPR;
			await entityManager.save(tournament);
		});
		logger.verbose(`startTournament: transaction complete`);
		return ejected.map(p => p.discordId);
	}

	async finishTournament(tournamentId: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		tournament.status = TournamentStatus.COMPLETE;
		await tournament.save();
	}

	async confirmPlayer(tournamentId: string, playerId: string, challongeId: number, deck: string): Promise<void> {
		let participant = await Participant.findOne({ tournamentId, discordId: playerId });
		await getConnection().transaction(async entityManager => {
			if (!participant) {
				participant = new Participant();
				participant.tournamentId = tournamentId;
				participant.discordId = playerId;
				await entityManager.save(participant);
			}
			if (!participant.confirmed) {
				participant.confirmed = new ConfirmedParticipant();
				participant.confirmed.tournamentId = tournamentId;
				participant.confirmed.discordId = playerId;
				participant.confirmed.challongeId = challongeId;
			}
			participant.confirmed.deck = deck;
			await entityManager.save(participant.confirmed);
			await entityManager.save(participant);
		});
	}

	async getActiveTournaments(server?: string): Promise<DatabaseTournament[]> {
		const owningDiscordServer = server || Not(IsNull());
		const tournaments = await ChallongeTournament.find({
			where: [
				{ owningDiscordServer, status: TournamentStatus.IPR },
				{ owningDiscordServer, status: TournamentStatus.PREPARING }
			]
		});
		return tournaments.map(t => this.wrap(t));
	}

	async synchronise(tournamentId: string, newData: SynchroniseTournament): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		await getConnection().transaction(async entityManager => {
			tournament.name = newData.name;
			tournament.description = newData.description;
			await entityManager.save(tournament);

			for (const newPlayer of newData.players) {
				if (!tournament.confirmed.find(p => p.challongeId === newPlayer.challongeId)) {
					const participant = new Participant();
					participant.tournamentId = tournamentId;
					participant.discordId = newPlayer.discordId;
					await entityManager.save(participant);
					participant.confirmed = new ConfirmedParticipant();
					participant.confirmed.tournamentId = tournamentId;
					participant.confirmed.discordId = newPlayer.discordId;
					participant.confirmed.challongeId = newPlayer.challongeId;
					participant.confirmed.deck = "ydke://!!!";
					await entityManager.save(participant.confirmed);
					await entityManager.save(participant);
				}
			}
		});
	}

	/// @throws {TournamentNotFoundError}
	/// @throws {AssertStatusError}
	/// @throws {EntityNotFoundError}
	private async byeHelper(
		tournamentId: string,
		playerId: string,
		operation: (participant: ConfirmedParticipant) => Promise<void>
	): Promise<string[]> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== TournamentStatus.PREPARING) {
			throw new AssertStatusError(tournamentId, TournamentStatus.PREPARING, tournament.status);
		}
		const participant = await ConfirmedParticipant.findOneOrFail({ tournamentId, discordId: playerId });
		await operation(participant);
		await participant.save();
		const byes = await ConfirmedParticipant.find({ tournamentId, hasBye: true });
		return byes.map(p => p.discordId);
	}

	async registerBye(tournamentId: string, playerId: string): Promise<string[]> {
		return await this.byeHelper(tournamentId, playerId, async participant => {
			if (participant.hasBye) {
				throw new UserError(`Player ${playerId} already has a bye in Tournament ${tournamentId}`);
			}
			participant.hasBye = true;
		});
	}

	async removeBye(tournamentId: string, playerId: string): Promise<string[]> {
		return await this.byeHelper(tournamentId, playerId, async participant => {
			if (!participant.hasBye) {
				throw new UserError(`Player ${playerId} does not have a bye in Tournament ${tournamentId}`);
			}
			participant.hasBye = false;
		});
	}

	async dropFromAll(
		server: string,
		playerId: string
	): Promise<{ tournamentId: string; privateChannels: string[]; challongeId?: number }[]> {
		return await getConnection().transaction(async entityManager => {
			// Retrieve corresponding Participant entities for unfinished tournaments belonging to the server.
			const participants = await entityManager
				.getRepository(Participant)
				.createQueryBuilder()
				// Fill in the tournament relation while filtering only for the relevant tournaments.
				.innerJoinAndSelect(
					"Participant.tournament",
					"T",
					"(T.status = 'preparing' OR T.status = 'in progress') AND T.owningDiscordServer = :server AND Participant.discordId = :playerId",
					{ server, playerId }
				)
				// Fill in the confirmed relation if possible.
				.leftJoinAndSelect("Participant.confirmed", "confirmed")
				.getMany();
			for (const participant of participants) {
				await entityManager.remove(participant);
			}
			return participants.map(participant => ({
				tournamentId: participant.tournament.tournamentId,
				privateChannels: participant.tournament.privateChannels,
				challongeId: participant.confirmed?.challongeId
			}));
		});
	}

	async getConfirmed(tournamentId: string): Promise<DatabasePlayer[]> {
		// is this how to use select properly? it seems off that it still returns a full tournament object
		const players = await ChallongeTournament.findOneOrFail(tournamentId, { select: ["confirmed"] });
		return players.confirmed;
	}

	async getConfirmedPlayer(discordId: string, tournamentId: string): Promise<DatabasePlayer> {
		const p = await ConfirmedParticipant.findOneOrFail({ discordId, tournamentId });
		return {
			discordId: p.discordId,
			challongeId: p.challongeId,
			deck: p.deck
		};
	}

	async getPlayerByChallonge(challongeId: number, tournamentId: string): Promise<DatabasePlayer> {
		const p = await ConfirmedParticipant.findOneOrFail({ challongeId, tournamentId });
		return {
			discordId: p.discordId,
			challongeId: p.challongeId,
			deck: p.deck
		};
	}
}

export async function initializeDatabase(postgresqlUrl: string): Promise<DatabaseWrapperPostgres> {
	await initializeConnection(postgresqlUrl);
	return new DatabaseWrapperPostgres();
}
