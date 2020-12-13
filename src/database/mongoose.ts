import {
	DatabaseTournament,
	DatabaseWrapper,
	DatabasePlayer,
	SynchroniseTournament,
	DatabaseMessage
} from "./interface";
import { TournamentModel, TournamentDoc } from "./models";
import { TournamentNotFoundError, UnauthorisedPlayerError, UserError } from "../errors";

type DiscordID = string;
type TournamentID = string; // from Challonge

interface MongoPlayer {
	challongeId: number;
	discordId: string;
	deck: string; // ydke url
}

export class DatabaseWrapperMongoose implements DatabaseWrapper {
	private wrapTournament(tournament: TournamentDoc): DatabaseTournament {
		return {
			id: tournament.tournamentId,
			name: tournament.name,
			description: tournament.description,
			status: tournament.status,
			hosts: tournament.hosts,
			players: tournament.confirmedParticipants.map(p => p.discordId),
			publicChannels: tournament.publicChannels,
			privateChannels: tournament.privateChannels,
			server: tournament.owningDiscordServer,
			findHost: this.findHost(tournament).bind(this),
			findPlayer: this.findPlayer(tournament).bind(this)
		};
	}

	private findHost(tournament: TournamentDoc): (id: string) => boolean {
		return (id: string): boolean => tournament.hosts.includes(id);
	}

	private wrapPlayer(player: MongoPlayer): DatabasePlayer {
		return { discordId: player.discordId, challongeId: player.challongeId, deck: player.deck };
	}

	private findPlayer(tournament: TournamentDoc): (id: string) => DatabasePlayer {
		return (id: string): DatabasePlayer => {
			const p = tournament.confirmedParticipants.find(p => p.discordId === id);
			if (!p) {
				throw new UnauthorisedPlayerError(id, tournament.id);
			}
			return this.wrapPlayer(p);
		};
	}

	// Invoke after a host requests a tournament and it is created on Challonge
	public async createTournament(
		hostId: DiscordID,
		serverId: DiscordID,
		tournamentId: TournamentID,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		const tournament = new TournamentModel({
			name,
			description,
			tournamentId,
			hosts: [hostId],
			owningDiscordServer: serverId
		});
		await tournament.save();
		return this.wrapTournament(tournament);
	}

	public async getTournament(tournamentId: TournamentID): Promise<DatabaseTournament> {
		return this.wrapTournament(await this.findTournament(tournamentId));
	}

	private async findTournament(tournamentId: TournamentID): Promise<TournamentDoc> {
		const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
		if (!tournament) {
			throw new TournamentNotFoundError(tournamentId);
		}
		return tournament;
	}

	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (!(tournament.status === "preparing")) {
			throw new UserError(`It's too late to update the information for ${tournament.name}.`);
		}
		tournament.name = name;
		tournament.description = desc;
		await tournament.save();
	}

	public async addAnnouncementChannel(
		tournamentId: TournamentID,
		channelId: DiscordID,
		kind: "public" | "private" = "public"
	): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
		channels.push(channelId);
		await tournament.save();
	}

	public async removeAnnouncementChannel(
		tournamentId: TournamentID,
		channelId: DiscordID,
		kind: "public" | "private" = "public"
	): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
		const i = channels.indexOf(channelId);
		if (i < 0) {
			throw new UserError(
				`Channel ${channelId} is not a ${kind} announcement channel for Tournament ${tournamentId}!`
			);
		}
		channels.splice(i, 1); // consider $pullAll
		await tournament.save();
	}

	public async addHost(tournamentId: TournamentID, hostId: DiscordID): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.hosts.includes(hostId)) {
			throw new UserError(`Tournament ${tournamentId} already includes user ${hostId} as a host!`);
		}
		tournament.hosts.push(hostId);
		await tournament.save();
	}

	public async removeHost(tournamentId: TournamentID, hostId: DiscordID): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.hosts.length < 2) {
			throw new UserError(`Tournament ${tournamentId} has too few hosts to remove one!`);
		}
		if (!tournament.hosts.includes(hostId)) {
			throw new UserError(`Tournament ${tournamentId} doesn't include user ${hostId} as a host!`);
		}
		const i = tournament.hosts.indexOf(hostId);
		// i < 0 is impossible by precondition
		tournament.hosts.splice(i, 1);
		await tournament.save();
	}

	private async findTournamentByRegisterMessage(
		channelId: DiscordID,
		messageId: DiscordID
	): Promise<TournamentDoc | null> {
		return await TournamentModel.findOne({
			"registerMessages.channel": channelId,
			"registerMessages.message": messageId
		});
	}

	// Invoke after a registration message has been sent to an announcement channel.
	public async openRegistration(
		tournamentId: TournamentID,
		channelId: DiscordID,
		messageId: DiscordID
	): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		tournament.registerMessages.push({ messageId, channelId });
		await tournament.save();
	}

	public async getRegisterMessages(tournamentId: string): Promise<DatabaseMessage[]> {
		const tournament = await this.findTournament(tournamentId);
		return tournament.registerMessages;
	}

	// Invoke after a registration message gets deleted.
	public async cleanRegistration(channelId: DiscordID, messageId: DiscordID): Promise<void> {
		const tournament = await this.findTournamentByRegisterMessage(channelId, messageId);
		if (!tournament) {
			return; // failure is OK
		}
		const i = tournament.registerMessages.indexOf({ messageId, channelId });
		// i < 0 is impossible by precondition
		tournament.registerMessages.splice(i, 1); // consider $pullAll
		await tournament.save();
	}

	public async getPendingTournaments(playerId: string): Promise<DatabaseTournament[]> {
		const tournaments = await TournamentModel.find({
			pendingParticipants: playerId
		});
		return tournaments.map(this.wrapTournament.bind(this));
	}

	// Invoke after a user requests to join a tournament and the appropriate response is delivered.
	// Returns undefined if cannot be added.
	public async addPendingPlayer(
		channelId: DiscordID,
		messageId: DiscordID,
		playerId: DiscordID
	): Promise<DatabaseTournament | undefined> {
		const tournament = await this.findTournamentByRegisterMessage(channelId, messageId);
		if (!tournament) {
			return;
		}
		if (!tournament.pendingParticipants.includes(playerId)) {
			tournament.pendingParticipants.push(playerId);
			await tournament.save();
			return this.wrapTournament(tournament);
		}
	}

	// Invoke after a user requests to leave a tournament they haven't been confirmed for.
	public async removePendingPlayer(
		channelId: DiscordID,
		messageId: DiscordID,
		playerId: DiscordID
	): Promise<DatabaseTournament | undefined> {
		const tournament = await TournamentModel.findOneAndUpdate(
			{
				"registerMessages.channelId": channelId,
				"registerMessages.messageId": messageId,
				pendingParticipants: playerId
			},
			{
				$pull: { pendingParticipants: playerId }
			}
		);
		return tournament ? this.wrapTournament(tournament) : undefined;
	}

	// Invoke after a user requests to leave a tournament they have been confirmed for
	public async removeConfirmedPlayerReaction(
		messageId: DiscordID,
		channelId: DiscordID,
		playerId: DiscordID
	): Promise<DatabaseTournament | undefined> {
		const tournament = await TournamentModel.findOneAndUpdate(
			{
				"registerMessages.channelId": channelId,
				"registerMessages.messageId": messageId,
				"confirmedParticipants.discordId": playerId
			},
			{
				$pull: { confirmedParticipants: { discordId: playerId } }
			}
		);
		return tournament ? this.wrapTournament(tournament) : undefined;
	}

	// Invoke after a host removes a player from a tournament they have been confirmed for
	public async removeConfirmedPlayerForce(
		tournamentId: TournamentID,
		playerId: DiscordID
	): Promise<DatabaseTournament | undefined> {
		const tournament = await TournamentModel.findOneAndUpdate(
			{
				tournamentId,
				"confirmedParticipants.discord": playerId
			},
			{
				$pull: { confirmedParticipants: { discordId: playerId } }
			}
		);
		return tournament ? this.wrapTournament(tournament) : undefined;
	}

	// Remove all pending participants and start the tournament
	public async startTournament(tournamentId: TournamentID, rounds: number): Promise<string[]> {
		const tournament = await this.findTournament(tournamentId);
		const removedIDs = tournament.pendingParticipants.slice(); // clone values
		tournament.pendingParticipants = [];
		tournament.status = "in progress";
		tournament.currentRound = 1;
		tournament.totalRounds = rounds;
		await tournament.save();
		return removedIDs;
	}

	// Progresses tournament to the next round or returns -1 if it was already the final round
	public async nextRound(tournamentId: TournamentID): Promise<number> {
		const tournament = await this.findTournament(tournamentId);
		if (tournament.status !== "in progress") {
			throw new Error(`Tournament ${tournamentId} is not in progress.`);
		}
		if (tournament.currentRound < tournament.totalRounds) {
			++tournament.currentRound;
			await tournament.save();
			return tournament.currentRound;
		}
		return -1;
	}

	// Sets tournament status to completed
	public async finishTournament(tournamentId: TournamentID): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		tournament.status = "complete";
		await tournament.save();
	}

	// Invoke after a participant's deck is validated and they are registered on Challonge
	public async confirmPlayer(
		tournamentId: TournamentID,
		participantId: DiscordID,
		challongeId: number,
		deck: string
	): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		const i = tournament.pendingParticipants.indexOf(participantId);
		if (i >= 0) {
			tournament.pendingParticipants.splice(i, 1); // consider $pullAll
		}
		const participant = tournament.confirmedParticipants.find(p => p.discordId === participantId);
		if (participant) {
			participant.deck = deck;
		} else {
			tournament.confirmedParticipants.push({
				challongeId,
				discordId: participantId,
				deck: deck
			});
		}
		await tournament.save();
	}

	// Get persisted tournaments that are not finished, for restoration upon launch
	public async getActiveTournaments(): Promise<DatabaseTournament[]> {
		const tournaments = await TournamentModel.find({ $or: [{ status: "in progress" }, { status: "preparing" }] });
		return tournaments.map(this.wrapTournament.bind(this));
	}

	// Update information to reflect the state on the remote website
	public async synchronise(tournamentId: TournamentID, newDoc: SynchroniseTournament): Promise<void> {
		const tournament = await this.findTournament(tournamentId);
		// insert new players
		for (const newPlayer of newDoc.players) {
			const player = tournament.confirmedParticipants.find(p => p.challongeId === newPlayer);
			// if a player already exist, challonge doesn't have any info that should have changed
			if (!player) {
				tournament.confirmedParticipants.push({
					challongeId: newPlayer,
					discordId: "DUMMY",
					deck: "ydke://!!!" // blank deck
				});
			}
		}
		tournament.name = newDoc.name;
		tournament.description = newDoc.description;
		await tournament.save();
	}
}
