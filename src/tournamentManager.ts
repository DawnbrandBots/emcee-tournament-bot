import { Deck } from "ydeck";
import { DatabaseInterface } from "./databaseGeneric";
import { database } from "./databaseMongoose";
import { discord } from "./discordEris";
import { DiscordInterface } from "./discordGeneric";
import { website } from "./websiteChallonge";
import { WebsiteInterface } from "./websiteGeneric";

export class TournamentManager {
	private discord: DiscordInterface;
	private database: DatabaseInterface;
	private website: WebsiteInterface;
	constructor(discord: DiscordInterface, database: DatabaseInterface, website: WebsiteInterface) {
		this.discord = discord;
		this.database = database;
		this.website = website;
	}
	public async authenticateHost(tournamentId: string, hostId: string): Promise<void> {
		await this.database.authenticateHost(tournamentId, hostId);
	}

	public async authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
		await this.database.authenticatePlayer(tournamentId, playerId);
	}

	public async listTournaments(): Promise<string> {
		const list = await this.database.listTournaments();
		const text = list.map(t => `${t.name}\t${t.players.length} players`);
		return text.join("\n");
	}

	public async createTournament(host: string, server: string, name: string, desc: string): Promise<[string, string]> {
		const web = await this.website.createTournament(name, desc);
		await this.database.createTournament(host, server, web);
		return [web.id, web.url];
	}
	public async updateTournament(tournamentId: string, name: string, desc: string): Promise<void> {
		// Update DB first because it performs an important check that might throw
		await this.database.updateTournament(tournamentId, name, desc);
		await this.website.updateTournament(tournamentId, name, desc);
	}
	public async addAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async removeAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async addHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async removeHost(tournamentId: string, newHost: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async openTournament(tournamentId: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async startTournament(tournamentId: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async cancelTournament(tournamentId: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async submitScore(
		tournamentId: string,
		playerId: string,
		scorePlayer: number,
		scoreOpp: number
	): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async nextRound(tournamentId: string): Promise<number> {
		throw new Error("Not implemented!");
	}

	public async listPlayers(tournamentId: string): Promise<string> {
		throw new Error("Not implemented!");
	}

	public async getPlayerDeck(tournamentId: string, playerId: string): Promise<Deck> {
		throw new Error("Not implemented!");
	}

	public async dropPlayer(tournamentId: string, playerId: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async syncTournament(tournamentId: string): Promise<void> {
		throw new Error("Not implemented!");
	}
}

export const tournamentManager = new TournamentManager(discord, database, website);
