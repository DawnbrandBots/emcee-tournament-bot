import { DatabaseInterface, DatabaseTournament, DatabaseWrapper, DatabasePlayer } from ".";
import { TournamentModel, TournamentDoc } from "./models";
import { TournamentNotFoundError, UnauthorisedHostError } from "../errors";

type DiscordID = string;
type TournamentID = string; // from Challonge

interface MongoPlayer {
	challongeId: number;
	discord: string;
	deck?: string; // ydke url
}

export interface SyncDoc {
	confirmedParticipants: number[];
	name: string;
	description: string;
	totalRounds: number;
}

class DatabaseWrapperMongoose implements DatabaseWrapper {
	private wrapTournament(tournament: TournamentDoc): DatabaseTournament {
		return {
			id: tournament.challongeId,
			name: tournament.name,
			description: tournament.description,
			status: tournament.status,
			players: tournament.confirmedParticipants.map(p => p.discord),
			findHost: this.findHost(tournament),
			findPlayer: this.findPlayer(tournament),
			updateDetails: this.updateDetails(tournament)
		};
	}

	private findHost(tournament: TournamentDoc): (id: string) => boolean {
		return (id: string): boolean => tournament.hosts.includes(id);
	}

	private wrapPlayer(player: MongoPlayer): DatabasePlayer {
		return { id: player.discord };
	}

	private findPlayer(tournament: TournamentDoc): (id: string) => DatabasePlayer | undefined {
		return (id: string): DatabasePlayer | undefined => {
			const p = tournament.confirmedParticipants.find(p => p.discord === id);
			return p ? this.wrapPlayer(p) : undefined;
		};
	}

	private updateDetails(tournament: TournamentDoc): (name: string, desc: string) => Promise<void> {
		return async (name: string, desc: string): Promise<void> => {
			tournament.name = name;
			tournament.description = desc;
			await tournament.save();
		};
	}

	// Invoke after a host requests a tournament and it is created on Challonge
	public async createTournament(
		host: DiscordID,
		server: DiscordID,
		challongeId: TournamentID,
		name: string,
		description: string
	): Promise<DatabaseTournament> {
		const tournament = new TournamentModel({
			name,
			description,
			challongeId,
			hosts: [host],
			owningDiscordServer: server
		});
		await tournament.save();
		return this.wrapTournament(tournament);
	}

	public async getTournament(challongeId: TournamentID): Promise<DatabaseTournament> {
		return this.wrapTournament(await this.findTournament(challongeId));
	}

	public async findTournament(challongeId: TournamentID): Promise<TournamentDoc> {
		const tournament = await TournamentModel.findOne({ challongeId });
		if (!tournament) {
			throw new TournamentNotFoundError(challongeId);
		}
		return tournament;
	}

	// Internal helper
	private async getAuthorizedTournament(challongeId: TournamentID, host: DiscordID): Promise<TournamentDoc> {
		const tournament = await this.findTournament(challongeId);
		if (!tournament.hosts.includes(host)) {
			throw new UnauthorisedHostError(host, challongeId);
		}
		return tournament;
	}

	public async addAnnouncementChannel(
		channel: DiscordID,
		challongeId: TournamentID,
		host: DiscordID,
		kind: "public" | "private" = "public"
	): Promise<void> {
		const tournament = await this.getAuthorizedTournament(challongeId, host);
		const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
		channels.push(channel);
		await tournament.save();
	}

	public async removeAnnouncementChannel(
		channel: DiscordID,
		challongeId: TournamentID,
		host: DiscordID,
		kind: "public" | "private" = "public"
	): Promise<boolean> {
		const tournament = await this.getAuthorizedTournament(challongeId, host);
		const channels = kind === "public" ? tournament.publicChannels : tournament.privateChannels;
		const i = channels.indexOf(channel);
		if (i < 0) {
			return false;
		}
		channels.splice(i, 1); // consider $pullAll
		await tournament.save();
		return true;
	}

	// Check if a Discord user can perform a Discord action related to a tournament.
	public async isOrganising(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
		const tournament = await this.findTournament(challongeId);
		return tournament.hosts.includes(host);
	}

	public async addHost(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
		const tournament = await this.findTournament(challongeId);
		if (tournament.hosts.includes(host)) {
			return false;
		}
		tournament.hosts.push(host);
		await tournament.save();
		return true;
	}

	public async removeHost(host: DiscordID, challongeId: TournamentID): Promise<boolean> {
		const tournament = await this.findTournament(challongeId);
		if (tournament.hosts.length < 2 || !tournament.hosts.includes(host)) {
			return false;
		}
		const i = tournament.hosts.indexOf(host);
		// i < 0 is impossible by precondition
		tournament.hosts.splice(i, 1);
		await tournament.save();
		return true;
	}

	public async findTournamentByRegisterMessage(
		message: DiscordID,
		channel: DiscordID
	): Promise<TournamentDoc | null> {
		return await TournamentModel.findOne({
			"registerMessages.channel": channel,
			"registerMessages.message": message
		});
	}

	// Invoke after a registration message has been sent to an announcement channel.
	public async addRegisterMessage(message: DiscordID, channel: DiscordID, challongeId: TournamentID): Promise<void> {
		const tournament = await this.findTournament(challongeId);
		tournament.registerMessages.push({ message, channel });
		await tournament.save();
	}

	// Invoke after a registration message gets deleted.
	public async removeRegisterMessage(message: DiscordID, channel: DiscordID): Promise<boolean> {
		const tournament = await this.findTournamentByRegisterMessage(message, channel);
		if (!tournament) {
			return false;
		}
		const i = tournament.registerMessages.indexOf({ message, channel });
		// i < 0 is impossible by precondition
		tournament.registerMessages.splice(i, 1); // consider $pullAll
		await tournament.save();
		return true;
	}

	// Invoke after a user requests to join a tournament and the appropriate response is delivered.
	public async addPendingParticipant(message: DiscordID, channel: DiscordID, user: DiscordID): Promise<boolean> {
		const tournament = await this.findTournamentByRegisterMessage(message, channel);
		if (!tournament) {
			return false;
		}
		if (!tournament.pendingParticipants.includes(user)) {
			tournament.pendingParticipants.push(user);
			await tournament.save();
		}
		return true;
	}

	// Invoke after a user requests to leave a tournament they haven't been confirmed for.
	public async removePendingParticipant(message: DiscordID, channel: DiscordID, user: DiscordID): Promise<boolean> {
		return !!(await TournamentModel.findOneAndUpdate(
			{
				"registerMessages.channel": channel,
				"registerMessages.message": message,
				pendingParticipants: user
			},
			{
				$pull: { pendingParticipants: user }
			}
		));
	}

	// Invoke after a user requests to leave a tournament they have been confirmed for
	public async removeConfirmedParticipant(
		message: DiscordID,
		channel: DiscordID,
		user: DiscordID
	): Promise<MongoPlayer | undefined> {
		return (
			await TournamentModel.findOneAndUpdate(
				{
					"registerMessages.channel": channel,
					"registerMessages.message": message,
					"confirmedParticipants.discord": user
				},
				{
					$pull: { confirmedParticipants: { discord: user } }
				}
			)
		)?.confirmedParticipants.find(p => p.discord === user);
	}

	// Invoke after a host removes a player from a tournament they have been confirmed for
	public async dropConfirmedParticipant(
		challongeId: TournamentID,
		user: DiscordID
	): Promise<MongoPlayer | undefined> {
		return (
			await TournamentModel.findOneAndUpdate(
				{
					challongeId: challongeId,
					"confirmedParticipants.discord": user
				},
				{
					$pull: { confirmedParticipants: { discord: user } }
				}
			)
		)?.confirmedParticipants.find(p => p.discord === user);
	}

	// Remove all pending participants and start the tournament
	public async startTournament(challongeId: TournamentID, host: DiscordID, rounds: number): Promise<string[]> {
		const tournament = await this.getAuthorizedTournament(challongeId, host);
		const removedIDs = tournament.pendingParticipants.slice(); // clone values
		tournament.pendingParticipants = [];
		tournament.status = "in progress";
		tournament.currentRound = 1;
		tournament.totalRounds = rounds;
		await tournament.save();
		return removedIDs;
	}

	// Progresses tournament to the next round or returns -1 if it was already the final round
	public async nextRound(challongeId: TournamentID, host: DiscordID): Promise<number> {
		const tournament = await this.getAuthorizedTournament(challongeId, host);
		if (tournament.status !== "in progress") {
			throw new Error(`Tournament ${challongeId} is not in progress.`);
		}
		if (tournament.currentRound < tournament.totalRounds) {
			++tournament.currentRound;
			await tournament.save();
			return tournament.currentRound;
		}
		return -1;
	}

	// Sets tournament status to completed
	public async finishTournament(challongeId: TournamentID, host: DiscordID): Promise<void> {
		const tournament = await this.getAuthorizedTournament(challongeId, host);
		tournament.status = "complete";
		await tournament.save();
	}

	// Invoke after a participant's deck is validated and they are registered on Challonge
	public async confirmParticipant(
		tournamentId: DiscordID,
		participantId: DiscordID,
		challongeId: number,
		deck: string
	): Promise<boolean> {
		const tournament = await TournamentModel.findOne({ challongeId: tournamentId });
		if (!tournament) {
			return false;
		}
		const i = tournament.pendingParticipants.indexOf(participantId);
		if (i >= 0) {
			tournament.pendingParticipants.splice(i, 1); // consider $pullAll
		}
		const participant = tournament.confirmedParticipants.find(p => p.discord === participantId);
		if (participant) {
			participant.deck = deck;
		} else {
			tournament.confirmedParticipants.push({
				challongeId,
				discord: participantId,
				deck: deck
			});
		}
		await tournament.save();
		return true;
	}

	public async setTournamentName(challongeId: string, name: string): Promise<string> {
		const old = await TournamentModel.findOneAndUpdate({ challongeId }, { name });
		if (!old) {
			throw new TournamentNotFoundError(challongeId);
		}
		return old.name;
	}

	public async setTournamentDescription(challongeId: string, description: string): Promise<string> {
		const old = await TournamentModel.findOneAndUpdate({ challongeId }, { description });
		if (!old) {
			throw new TournamentNotFoundError(challongeId);
		}
		return old.description;
	}

	public async getPlayerFromId(challongeId: TournamentID, playerId: number): Promise<MongoPlayer | undefined> {
		const tournament = await this.findTournament(challongeId);
		return tournament.confirmedParticipants.find(p => p.challongeId === playerId);
	}

	public async getPlayerFromDiscord(
		challongeId: TournamentID,
		discordId: DiscordID
	): Promise<MongoPlayer | undefined> {
		const tournament = await this.findTournament(challongeId);
		return tournament.confirmedParticipants.find(p => p.discord === discordId);
	}

	// Get persisted tournaments that are not finished, for restoration upon launch
	public async getActiveTournaments(): Promise<DatabaseTournament[]> {
		const tournaments = await TournamentModel.find({ $or: [{ status: "in progress" }, { status: "preparing" }] });
		return tournaments.map(this.wrapTournament);
	}

	// Update information to reflect the state in the challonge API
	public async synchronise(challongeId: TournamentID, newDoc: SyncDoc): Promise<void> {
		const tournament = await this.findTournament(challongeId);
		// insert new players
		for (const newPlayer of newDoc.confirmedParticipants) {
			const player = tournament.confirmedParticipants.find(p => p.challongeId === newPlayer);
			// if a player already exist, challonge doesn't have any info that should have changed
			if (!player) {
				tournament.confirmedParticipants.push({
					challongeId: newPlayer,
					discord: "DUMMY"
				});
			}
		}
		tournament.name = newDoc.name;
		tournament.description = newDoc.description;
		tournament.totalRounds = newDoc.totalRounds;
		await tournament.save();
	}
}

const mongoose = new DatabaseWrapperMongoose();
export const database = new DatabaseInterface(mongoose);
