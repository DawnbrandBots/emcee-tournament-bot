import { Deck } from "ydeck";
import { DatabaseInterface, DatabaseTournament } from "../database/interface";
import { DiscordInterface, DiscordMessageIn } from "../discord/interface";
import { WebsiteInterface } from "../website/interface";
import { BlockedDMsError, UnauthorisedPlayerError, UserError } from "../errors";
import { getDeck } from "../deck";
import { getDeckFromMessage, prettyPrint } from "../discordDeck";
import { Logger } from "winston";

export class TournamentManager {
	private discord: DiscordInterface;
	private database: DatabaseInterface;
	private website: WebsiteInterface;
	private logger: Logger;
	constructor(discord: DiscordInterface, database: DatabaseInterface, website: WebsiteInterface, logger: Logger) {
		this.discord = discord;
		this.database = database;
		this.website = website;
		this.logger = logger;
	}
	public async authenticateHost(tournamentId: string, hostId: string): Promise<void> {
		await this.database.authenticateHost(tournamentId, hostId);
	}

	public async authenticatePlayer(tournamentId: string, playerId: string): Promise<void> {
		await this.database.authenticatePlayer(tournamentId, playerId);
	}

	public async listTournaments(): Promise<string> {
		const list = await this.database.listTournaments();
		const text = list.map(t => `ID: ${t.id}|Name: ${t.name}|Status: ${t.status}|Players: ${t.players.length}`);
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
		await this.database.addAnnouncementChannel(tournamentId, channel, type);
	}

	public async removeAnnouncementChannel(
		tournamentId: string,
		channel: string,
		type: "public" | "private"
	): Promise<void> {
		await this.database.removeAnnouncementChannel(tournamentId, channel, type);
	}

	public async addHost(tournamentId: string, newHost: string): Promise<void> {
		await this.database.addHost(tournamentId, newHost);
	}

	public async removeHost(tournamentId: string, newHost: string): Promise<void> {
		await this.database.removeHost(tournamentId, newHost);
	}

	private async handleDmFailure(userId: string, tournament: DatabaseTournament): Promise<void> {
		const channels = tournament.privateChannels;
		await Promise.all(
			channels.map(async c => {
				await this.discord.sendMessage(
					c,
					`Player ${this.discord.mentionUser(userId)} (${this.discord.getUsername(
						userId
					)}) is trying to sign up for Tournament ${tournament.name} (${
						tournament.id
					}), but I cannot send them DMs. Please ask them to allow DMs from this server.`
				);
			})
		);
	}

	private async registerPlayer(msg: DiscordMessageIn, userId: string): Promise<void> {
		const tournament = await this.database.addPendingPlayer(msg.channel, msg.id, userId);
		if (tournament) {
			try {
				await this.discord.sendDirectMessage(
					userId,
					`You registering for ${tournament.name}. ` +
						"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
				);
				this.logger.verbose(`User ${userId} registered for tournament ${tournament.id}.`);
			} catch (e) {
				if (e instanceof BlockedDMsError) {
					await this.handleDmFailure(userId, tournament);
				} else {
					throw e;
				}
			}
		}
	}

	public async confirmPlayer(msg: DiscordMessageIn): Promise<void> {
		const tournaments = await this.database.getPendingTournaments(msg.author);
		if (tournaments.length > 1) {
			const out = tournaments.map(t => t.name).join("\n");
			await msg.reply(
				`You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\n${out}`
			);
			return;
		}
		if (tournaments.length === 1) {
			const tournament = tournaments[0];
			const deck = await getDeckFromMessage(msg);
			const [content, file] = prettyPrint(deck, `${this.discord.getUsername(msg.author)}.ydk`);
			if (deck.validationErrors.length > 0) {
				await msg.reply(
					`Your deck is not legal for Tournament ${tournament.name}. Please see the print out below for all the errors. You have NOT been registered yet, please submit again with a legal deck.`
				);
				await msg.reply(content, file);
				return;
			}
			const challongeId = await this.website.registerPlayer(
				tournament.id,
				this.discord.getUsername(msg.author),
				msg.author
			);
			await this.database.confirmPlayer(tournament.id, msg.author, challongeId, deck.url);
			const channels = tournament.privateChannels;
			await Promise.all(
				channels.map(async c => {
					await this.discord.sendMessage(
						c,
						`Player ${this.discord.mentionUser(msg.author)} (${this.discord.getUsername(
							msg.author
						)}) has signed up for Tournament ${tournament.name} (${tournament.id}) with the following deck!`
					);
					await this.discord.sendMessage(c, content, file);
				})
			);
			this.logger.verbose(`User ${msg.author} confirmed for tournament ${tournament.id}.`);
			await msg.reply(
				`You have successfully signed up for Tournament ${tournament.name}! Your deck is below to double-check.`
			);
			await msg.reply(content, file);
		}
	}

	public async cleanRegistration(msg: DiscordMessageIn): Promise<void> {
		await this.database.cleanRegistration(msg.channel, msg.id);
	}

	private CHECK_EMOJI = "✅";
	public async openTournament(tournamentId: string): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId);
		const channels = tournament.publicChannels;
		if (channels.length < 1) {
			throw new UserError(
				"You must register at least one public announcement channel before opening a tournament for registration!"
			);
		}
		await Promise.all(
			channels.map(async c => {
				const content = `__Registration now open for **${tournament.name}**!__\n${tournament.description}\n__Click the ${this.CHECK_EMOJI} below to sign up!`;
				const msg = await this.discord.awaitReaction(content, c, this.CHECK_EMOJI, this.registerPlayer);
				await this.database.openRegistration(tournamentId, msg.channel, msg.id);
			})
		);
	}

	private async sendNewRoundMessage(
		channel: string,
		round: number,
		tournament: DatabaseTournament,
		url: string,
		bye?: string
	): Promise<void> {
		const role = await this.discord.getPlayerRole(tournament.id, channel);
		let message = `Round ${round} of ${tournament.name} has begun! ${this.discord.mentionRole(
			role
		)}\nPairings: ${url}`;
		if (bye) {
			message += `\n${this.discord.mentionUser(bye)} has the bye for this round.`;
		}
		await this.discord.sendMessage(channel, message);
	}

	public async startTournament(tournamentId: string): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId);
		if (tournament.players.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		// TODO: delete register messages
		// get challonge rounds with current player pool
		const webTourn = await this.website.getTournament(tournamentId);
		// drop pending participants
		const droppedPlayers = await this.database.startTournament(tournamentId, webTourn.rounds);
		await Promise.all(
			droppedPlayers.map(async p => {
				await this.discord.sendDirectMessage(
					p,
					`Sorry, Tournament ${tournament.name} has started and you didn't submit a deck, so you have been dropped.`
				);
			})
		);
		// start tournament on challonge
		await this.website.startTournament(tournamentId);
		const bye = await this.website.getBye(tournamentId);
		// send round 1 message
		const channels = tournament.publicChannels;
		await Promise.all(
			channels.map(async c => {
				await this.sendNewRoundMessage(c, 1, tournament, webTourn.url, bye);
			})
		);
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
		const tourn = await this.database.getTournament(tournamentId);
		const player = tourn.findPlayer(playerId);
		if (!player) {
			throw new UnauthorisedPlayerError(playerId, tournamentId);
		}
		return await getDeck(player.deck);
	}

	public async dropPlayer(tournamentId: string, playerId: string): Promise<void> {
		throw new Error("Not implemented!");
	}

	public async syncTournament(tournamentId: string): Promise<void> {
		const tournamentData = await this.website.getTournament(tournamentId);
		await this.database.synchronise(tournamentId, {
			name: tournamentData.name,
			description: tournamentData.desc,
			players: tournamentData.players.map(p => p.challongeId)
		});
	}
}
