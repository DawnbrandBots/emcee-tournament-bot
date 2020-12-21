import { getConnection } from "typeorm";
import { TournamentNotFoundError, UnauthorisedPlayerError, UserError } from "../util/errors";
import {
	DatabaseMessage,
	DatabasePlayer,
	DatabaseTournament,
	DatabaseWrapper,
	SynchroniseTournament
} from "./interface";
import {
	ChallongeTournament,
	ConfirmedParticipant,
	initializeConnection,
	Participant,
	RegisterMessage,
	TournamentStatus
} from "./orm";

export class DatabaseWrapperPostgres implements DatabaseWrapper {
	private wrap(tournament: ChallongeTournament): DatabaseTournament {
		return {
			id: tournament.tournamentId,
			name: tournament.name,
			description: tournament.description,
			status: tournament.status,
			hosts: tournament.hosts.slice(),
			players: tournament.confirmed.map(p => p.discordId),
			publicChannels: tournament.publicChannels.slice(),
			privateChannels: tournament.privateChannels.slice(),
			server: tournament.owningDiscordServer,
			byes: tournament.confirmed.filter(p => p.hasBye).map(p => p.discordId),
			findHost: (id: string): boolean => tournament.hosts.includes(id),
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

	async getTournament(tournamentId: string): Promise<DatabaseTournament> {
		return this.wrap(await this.findTournament(tournamentId));
	}

	async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== TournamentStatus.PREPARING) {
			throw new UserError(`It's too late to update the information for ${tournament.name}.`);
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

	async getRegisterMessages(tournamentId: string): Promise<DatabaseMessage[]> {
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

	async addPendingPlayer(
		channelId: string,
		messageId: string,
		playerId: string
	): Promise<DatabaseTournament | undefined> {
		const message = await RegisterMessage.findOne({ channelId, messageId });
		if (!message) {
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
		if (!message) {
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
		const tournament = await this.findTournament(tournamentId, ["participants"]);
		const ejected = tournament.participants.filter(p => !p.confirmed);
		await getConnection().transaction(async entityManager => {
			// return await improves async stack traces
			await Promise.all(ejected.map(async p => await entityManager.remove(p)));
			tournament.status = TournamentStatus.IPR;
			await tournament.save();
		});
		return ejected.map(p => p.discordId);
	}

	async finishTournament(tournamentId: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		tournament.status = TournamentStatus.COMPLETE;
		await tournament.save();
	}

	async confirmPlayer(tournamentId: string, playerId: string, challongeId: number, deck: string): Promise<void> {
		let participant = await Participant.findOne({ tournamentId, discordId: playerId });
		if (!participant) {
			participant = new Participant();
			participant.tournamentId = tournamentId;
			participant.discordId = playerId;
		}
		if (!participant.confirmed) {
			participant.confirmed = new ConfirmedParticipant();
			participant.confirmed.tournamentId = tournamentId;
			participant.confirmed.discordId = playerId;
			participant.confirmed.challongeId = challongeId;
		}
		participant.confirmed.deck = deck;
		await participant.save();
	}

	async getActiveTournaments(): Promise<DatabaseTournament[]> {
		const tournaments = await ChallongeTournament.find({
			where: [{ status: TournamentStatus.IPR }, { status: TournamentStatus.PREPARING }]
		});
		return tournaments.map(t => this.wrap(t));
	}

	async synchronise(tournamentId: string, newData: SynchroniseTournament): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		for (const newPlayer of newData.players) {
			let player = tournament.confirmed.find(p => p.challongeId === newPlayer);
			// if a player already exists, Challonge doesn't have any info that should have changed
			if (!player) {
				player = new ConfirmedParticipant();
				player.challongeId = newPlayer;
				player.discordId = "DUMMY";
				player.deck = "ydke://!!!";
				tournament.confirmed.push(player);
			}
		}
		tournament.name = newData.name;
		tournament.description = newData.description;
		await tournament.save();
	}

	async registerBye(tournamentId: string, playerId: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== TournamentStatus.PREPARING) {
			throw new UserError(`Tournament ${tournamentId} is not pending.`);
		}
		const participant = await ConfirmedParticipant.findOneOrFail({ tournamentId, discordId: playerId });
		if (participant.hasBye) {
			throw new UserError(`Player ${playerId} already has a bye in Tournament ${tournament}`);
		}
		participant.hasBye = true;
		await participant.save();
	}

	async removeBye(tournamentId: string, playerId: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== TournamentStatus.PREPARING) {
			throw new UserError(`Tournament ${tournamentId} is not pending.`);
		}
		const participant = await ConfirmedParticipant.findOneOrFail({ tournamentId, discordId: playerId });
		if (!participant.hasBye) {
			throw new UserError(`Player ${playerId} does not have a bye in Tournament ${tournament}`);
		}
		participant.hasBye = true;
		await participant.save();
	}
}

export async function initializeDatabase(postgresqlUrl: string): Promise<DatabaseWrapperPostgres> {
	await initializeConnection(postgresqlUrl);
	return new DatabaseWrapperPostgres();
}
