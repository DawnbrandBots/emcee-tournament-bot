import { DatabaseTournament, TournamentStatus } from "./database/interface";
import { Participant, RegisterMessage } from "./database/orm";
import { DatabaseWrapperPostgres } from "./database/postgres";
import { DeckManager } from "./deck";
import { DiscordInterface, DiscordMessageIn, DiscordMessageLimited } from "./discord/interface";
import { dropPlayerChallonge } from "./drop";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { PersistentTimer } from "./timer";
import { BlockedDMsError, ChallongeAPIError, TournamentNotFoundError, UserError } from "./util/errors";
import { getLogger } from "./util/logger";
import { WebsiteInterface, WebsiteTournament } from "./website/interface";

const logger = getLogger("tournament");

interface MatchScore {
	playerId: number;
	playerDiscord: string;
	playerScore: number;
	oppScore: number;
}

type Public<T> = Pick<T, keyof T>;
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
export type TournamentInterface = Pick<
	TournamentManager,
	| "registerPlayer"
	| "confirmPlayer"
	| "cleanRegistration"
	| "createTournament"
	| "openTournament"
	| "startTournament"
	| "finishTournament"
	| "nextRound"
>;

/// "Link seam" to mock for testing
interface PersistentTimerDelegate {
	create: (...args: Tail<Parameters<typeof PersistentTimer.create>>) => ReturnType<typeof PersistentTimer.create>;
	loadAll: () => ReturnType<typeof PersistentTimer.loadAll>;
}

export class TournamentManager implements TournamentInterface {
	private matchScores: Record<number, MatchScore> = {};
	private timers: Record<string, PersistentTimer[]> = {}; // index: tournament id
	constructor(
		private discord: DiscordInterface,
		private database: Public<DatabaseWrapperPostgres>,
		private website: WebsiteInterface,
		private templater: Templater,
		private participantRole: ParticipantRoleProvider,
		private timer: PersistentTimerDelegate,
		private decks: DeckManager
	) {}

	public async loadTimers(): Promise<void> {
		if (Object.keys(this.timers).length) {
			logger.warn(new Error("loadTimers called multiple times"));
		} else {
			const timers = await this.timer.loadAll();
			let count = 0;
			for (const timer of timers) {
				if (timer.tournament) {
					this.timers[timer.tournament] = (this.timers[timer.tournament] || []).concat(timer);
					count++;
				} else {
					logger.warn(new Error("Aborting orphaned timer"));
					await timer.abort();
				}
			}
			const tournaments = Object.keys(this.timers).length;
			logger.info(`Loaded ${count} of ${timers.length} PersistentTimers for ${tournaments} tournaments.`);
		}
	}

	public async loadButtons(): Promise<void> {
		// TODO: check for repeated calls.
		const messages = await this.database.getRegisterMessages();
		let count = 0;
		for (const message of messages) {
			const discordMessage = await this.discord.getMessage(message.channelId, message.messageId);
			if (discordMessage) {
				this.discord.restoreReactionButton(
					discordMessage,
					this.CHECK_EMOJI,
					this.registerPlayer.bind(this),
					this.dropPlayerReaction.bind(this)
				);
				count++;
			} else {
				logger.warn(`On loading reaction buttons: ${message.channelId} ${message.messageId} was removed`);
			}
		}
		logger.info(`Loaded ${count} of ${messages.length} reaction buttons.`);
	}

	private async checkUrlTaken(url: string): Promise<boolean> {
		try {
			await this.website.getTournament(url);
			return true;
		} catch (e) {
			// This is an error which means the name is taken,
			// just not by Emcee.
			if (e.message === "You only have read access to this tournament") {
				return true;
			}
			// If the error is it not being found on website,
			// we should continue to the database check
			if (!(e instanceof ChallongeAPIError)) {
				throw e;
			}
		}
		try {
			await this.database.getTournament(url);
			return true;
		} catch (e) {
			if (e instanceof TournamentNotFoundError) {
				return false;
			}
			throw e;
		}
	}

	public async createTournament(
		hostId: string,
		serverId: string,
		name: string,
		desc: string,
		topCut = false
	): Promise<[string, string, string]> {
		// generate a URL based on the name, with added numbers to prevent conflicts
		const baseUrl = name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
		let candidateUrl = `${baseUrl}`;
		let i = 0;
		// while a tournament with that ID exists, the URL is taken
		while (await this.checkUrlTaken(candidateUrl)) {
			candidateUrl = `${baseUrl}${i}`;
			i++;
		}

		const web = await this.website.createTournament(name, desc, candidateUrl, topCut);
		await this.database.createTournament(hostId, serverId, web.id, name, desc);
		return [web.id, web.url, this.templater.format("create", web.id)];
	}

	private async handleDmFailure(playerId: string, tournament: DatabaseTournament): Promise<void> {
		const channels = tournament.privateChannels;
		await Promise.all(
			channels.map(async c => {
				await this.discord.sendMessage(
					c,
					`Player ${this.discord.mentionUser(playerId)} (${this.discord.getUsername(
						playerId
					)}) is trying to sign up for Tournament ${tournament.name} (${
						tournament.id
					}), but I cannot send them DMs. Please ask them to allow DMs from this server.`
				);
			})
		);
	}

	public async registerPlayer(msg: DiscordMessageIn, playerId: string): Promise<void> {
		const tournaments = await this.database.getPendingTournaments(playerId);
		if (tournaments.length > 0) {
			await this.discord.removeUserReaction(msg.channelId, msg.id, this.CHECK_EMOJI, playerId);
			// If DMs are blocked, this does end up logging by way of stack trace
			await this.discord.sendDirectMessage(
				playerId,
				`You can only sign up for 1 Tournament at a time! Please either drop from or complete your registration for ${tournaments[0].name}!`
			);
			return;
		}
		// addPendingPlayer needs to status-guard for preparing tournament
		const tournament = await this.database.addPendingPlayer(msg.channelId, msg.id, playerId);
		if (tournament) {
			try {
				await this.discord.sendDirectMessage(
					playerId,
					`You are registering for ${tournament.name}. ` +
						"Please submit a deck to complete your registration, by uploading a YDK file or sending a message with a YDKE URL."
				);
				logger.verbose(`User ${playerId} registered for tournament ${tournament.id}.`);
			} catch (e) {
				if (e instanceof BlockedDMsError) {
					await this.handleDmFailure(playerId, tournament);
				} else {
					throw e;
				}
			}
		}
	}

	public async confirmPlayer(msg: DiscordMessageIn): Promise<void> {
		// only check decklists in DMs
		if (msg.serverId !== "private") {
			return;
		}
		const tournaments = await this.database.getPendingTournaments(msg.author);
		if (tournaments.length > 1) {
			const out = tournaments.map(t => t.name).join(", ");
			await msg.reply(
				`You are registering in multiple tournaments. Please register in one at a time by unchecking the reaction on all others.\n${out}`
			);
			return;
		}
		if (tournaments.length === 1) {
			const tournament = tournaments[0];
			const deck = await this.decks.getDeckFromMessage(msg);
			if (!deck) {
				await msg.reply("Must provide either attached `.ydk` file or valid `ydke://` URL!");
				return;
			}
			const [content, file] = this.decks.prettyPrint(deck, `${this.discord.getUsername(msg.author)}.ydk`);
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
			await this.participantRole.grant(msg.author, tournament).catch(logger.error);
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
			logger.verbose(`User ${msg.author} confirmed for tournament ${tournament.id}.`);
			await msg.reply(
				`You have successfully signed up for Tournament ${tournament.name}! Your deck is below to double-check.`
			);
			await msg.reply(content, file);
			return;
		}
		// allow confirmed user to resubmit
		const confirmedTourns = await this.database.getConfirmedTournaments(msg.author);
		if (confirmedTourns.length > 1) {
			const out = confirmedTourns.map(t => t.name).join(", ");
			await msg.reply(
				`You're trying to update your deck for a tournament, but you're in multiple! Please choose one by dropping and registering again.\n${out}`
			);
			return;
		}
		if (confirmedTourns.length === 1) {
			const tournament = confirmedTourns[0];
			// tournament already confirmed preparing by filter
			const deck = await this.decks.getDeckFromMessage(msg);
			if (!deck) {
				await msg.reply("Must provide either attached `.ydk` file or valid `ydke://` URL!");
				return;
			}
			const [content, file] = this.decks.prettyPrint(deck, `${this.discord.getUsername(msg.author)}.ydk`);
			if (deck.validationErrors.length > 0) {
				await msg.reply(
					`Your new deck is not legal for Tournament ${tournament.name}. Please see the print out below for all the errors. Your deck has not been changed.`
				);
				await msg.reply(content, file);
				return;
			}
			// already registered on website
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const player = tournament.findPlayer(msg.author)!;
			// running for a confirmed player updates the deck
			await this.database.confirmPlayer(tournament.id, msg.author, player.challongeId, deck.url);
			const channels = tournament.privateChannels;
			await Promise.all(
				channels.map(async c => {
					await this.discord.sendMessage(
						c,
						`Player ${this.discord.mentionUser(msg.author)} (${this.discord.getUsername(
							msg.author
						)}) has updated their deck for Tournament ${tournament.name} (${
							tournament.id
						}) to the following!`
					);
					await this.discord.sendMessage(c, content, file);
				})
			);
			logger.verbose(`User ${msg.author} updated deck for tournament ${tournament.id}.`);
			await msg.reply(
				`You have successfully changed your deck for Tournament ${tournament.name}! Your deck is below to double-check.`
			);
			await msg.reply(content, file);
		}
	}

	public async cleanRegistration(msg: DiscordMessageLimited): Promise<void> {
		await this.database.cleanRegistration(msg.channelId, msg.id);
	}

	private CHECK_EMOJI = "✅";
	public async openTournament(tournamentId: string): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId, TournamentStatus.PREPARING);
		const channels = tournament.publicChannels;
		if (channels.length < 1) {
			throw new UserError(
				"You must register at least one public announcement channel before opening a tournament for registration!"
			);
		}
		await Promise.all(
			channels.map(async c => {
				const content = `__Registration now open for **${tournament.name}**!__\n${tournament.description}\n__Click the ${this.CHECK_EMOJI} below to sign up!__`;
				const msg = await this.discord.awaitReaction(
					content,
					c,
					this.CHECK_EMOJI,
					this.registerPlayer.bind(this),
					this.dropPlayerReaction.bind(this)
				);
				await this.database.openRegistration(tournamentId, msg.channelId, msg.id);
			})
		);
		await Promise.all(
			tournament.privateChannels.map(
				async c => await this.discord.sendMessage(c, this.templater.format("open", tournamentId))
			)
		);
	}

	// we could have logic for sending matchups in DMs in this function,
	// but we want this to send first and leave it largely self-contained
	private async sendNewRoundMessage(
		channelId: string,
		tournament: DatabaseTournament,
		url: string,
		round: number
	): Promise<void> {
		const role = this.discord.mentionRole(await this.participantRole.get(tournament));
		const message = `Round ${round} of ${tournament.name} has begun! ${role}\nPairings will be sent out by Direct Message shortly, or can be found here: ${url}`;
		await this.discord.sendMessage(channelId, message);
	}

	private async cancelTimers(tournament: DatabaseTournament): Promise<void> {
		for (const timer of this.timers[tournament.id] || []) {
			await timer.abort();
		}
		this.timers[tournament.id] = [];
	}

	private async sendMatchupDM(
		tournament: DatabaseTournament,
		receiverId: string,
		opponentId: string,
		opponentName: string | null,
		round: number
	): Promise<void> {
		let message = `Round ${round} of ${tournament.name} has begun! `;
		message += opponentName
			? `Your opponent is ${this.discord.mentionUser(
					opponentId
			  )} (${opponentName}). Make sure to report your score after the match is over!`
			: "I couldn't find your opponent. If you don't think you should have a bye for this round, please check the pairings.";
		try {
			await this.discord.sendDirectMessage(receiverId, message);
		} catch (e) {
			await this.reportMatchDMFailure(tournament, receiverId, opponentId);
		}
	}

	private async reportMatchDMFailure(
		tournament: DatabaseTournament,
		userId: string,
		opponent: string
	): Promise<void> {
		for (const channel of tournament.privateChannels) {
			await this.discord.sendMessage(
				channel,
				`I couldn't send a DM to ${this.discord.mentionUser(userId)} (${userId}) about their matchup for ${
					tournament.name
				}. If they're not a human player, this is normal, but otherwise please tell them their opponent is ${this.discord.mentionUser(
					opponent
				)} (${this.discord.getUsername(opponent)}), and vice versa.`
			);
		}
	}

	private async getRealUsername(userId: string): Promise<string | null> {
		// Naive check for an obviously invalid snowflake, such as the BYE# or DUMMY# we insert
		// This saves the overhead of an HTTP request
		if (!userId.length || userId[0] <= "0" || userId[0] >= "9") {
			return null;
		}
		return await this.discord.getRESTUsername(userId);
	}

	private async startNewRound(tournament: DatabaseTournament, url: string, skip = false): Promise<void> {
		const role = this.discord.mentionRole(await this.participantRole.get(tournament));
		await this.cancelTimers(tournament);
		const round = await this.website.getRound(tournament.id);
		this.timers[tournament.id] = await Promise.all(
			tournament.publicChannels.map(async channelId => {
				await this.sendNewRoundMessage(channelId, tournament, url, round);
				return await this.timer.create(
					new Date(Date.now() + 50 * 60 * 1000), // 50 minutes
					channelId,
					`That's time in the round, ${role}! Please end the current phase, then the player with the lower LP must forfeit!`,
					5, // update every 5 seconds
					tournament.id
				);
			})
		);
		// can skip sending DMs
		if (skip) {
			return;
		}
		// direct message matchups to players
		const matches = await this.website.getMatches(tournament.id);
		const players = await this.website.getPlayers(tournament.id);
		await Promise.all(
			matches.map(async match => {
				const player1 = players.find(p => p.challongeId === match.player1)?.discordId;
				const player2 = players.find(p => p.challongeId === match.player2)?.discordId;
				if (player1 && player2) {
					const name1 = await this.getRealUsername(player1);
					const name2 = await this.getRealUsername(player2);
					if (name1) {
						await this.sendMatchupDM(tournament, player1, player2, name2, round);
					} else {
						await this.reportMatchDMFailure(tournament, player1, player2);
					}
					if (name2) {
						await this.sendMatchupDM(tournament, player2, player1, name1, round);
					} else {
						await this.reportMatchDMFailure(tournament, player2, player1);
					}
				} else {
					// This error occuring is an issue on Challonge's end
					logger.warn(
						new Error(
							`Challonge IDs ${player1} and/or ${player2} found in match ${match.matchId} but not the player list.`
						)
					);
				}
			})
		);
		const bye = await this.website.getBye(tournament.id, matches);
		if (bye) {
			await this.discord.sendDirectMessage(
				bye,
				`Round ${round} of ${tournament.name} has begun! You have a bye for this round.`
			);
		}
	}

	public async startTournament(tournamentId: string): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId, TournamentStatus.PREPARING);
		if (tournament.players.length < 2) {
			throw new UserError("Cannot start a tournament without at least 2 confirmed participants!");
		}
		// delete register messages
		// TODO: can be a single transaction instead of relying on onDelete->cleanRegistration,
		//       a totally unclear relationship without the comment
		const messages = await this.database.getRegisterMessages(tournamentId);
		await Promise.all(
			messages.map(async m => {
				// onDelete handler will handle database cleanup
				await this.discord.deleteMessage(m.channelId, m.messageId);
			})
		);
		// drop pending participants
		const droppedPlayers = await this.database.startTournament(tournamentId);
		await Promise.all(
			droppedPlayers.map(async p => {
				await this.discord.sendDirectMessage(
					p,
					`Sorry, Tournament ${tournament.name} has started and you didn't submit a deck, so you have been dropped.`
				);
			})
		);
		// send command guide to players
		const channels = tournament.publicChannels;
		await Promise.all(
			channels.map(async c => await this.discord.sendMessage(c, this.templater.format("player", tournamentId)))
		);
		// send command guide to hosts
		await Promise.all(
			tournament.privateChannels.map(
				async c => await this.discord.sendMessage(c, this.templater.format("start", tournamentId))
			)
		);
		// start tournament on challonge
		await this.website.assignByes(tournamentId, tournament.byes);
		await this.website.startTournament(tournamentId);
		const webTourn = await this.website.getTournament(tournamentId);
		await this.startNewRound(tournament, webTourn.url);
		// drop dummy players once the tournament has started to give players with byes the win
		await this.website.dropByes(tournamentId, tournament.byes.length);
	}

	public async finishTournament(tournamentId: string, cancel = false): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId, TournamentStatus.IPR);
		const channels = tournament.publicChannels;
		let webTourn: WebsiteTournament;
		if (!cancel) {
			webTourn = await this.website.finishTournament(tournamentId);
		} else {
			// TODO: edit description to say cancelled?
			webTourn = await this.website.getTournament(tournamentId);
		}
		await this.cancelTimers(tournament);

		await this.database.finishTournament(tournamentId);
		const role = this.discord.mentionRole(await this.participantRole.get(tournament));
		await Promise.all(
			channels.map(async c => {
				await this.discord.sendMessage(
					c,
					`${tournament.name} has ${
						cancel ? "been cancelled." : "concluded!"
					} Thank you all for playing! ${role}\nResults: ${webTourn.url}`
				);
			})
		);
		await this.participantRole.delete(tournament);
	}

	// specifically only handles telling participants about a new round
	// hosts should handle outstanding scores individually with forcescore
	public async nextRound(tournamentId: string, skip = false): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId, TournamentStatus.IPR);
		const webTourn = await this.website.getTournament(tournamentId);
		await this.startNewRound(tournament, webTourn.url, skip);
	}

	private async dropPlayerReaction(msg: DiscordMessageLimited, playerId: string): Promise<void> {
		const participant = await Participant.createQueryBuilder()
			.where({ discordId: playerId })
			.innerJoinAndSelect(RegisterMessage, "M", "M.tournamentId = Participant.tournamentId")
			.andWhere("M.channelId = :channelId AND M.messageId = :messageId", {
				channelId: msg.channelId,
				messageId: msg.id
			})
			.leftJoinAndSelect("Participant.tournament", "tournament")
			.leftJoinAndSelect("Participant.confirmed", "confirmed")

			.getOne();
		if (!participant) {
			logger.warn(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: playerId,
					event: "drop reaction fail"
				})
			);
			return;
		}
		function log(payload: Record<string, unknown>): void {
			logger.verbose(
				JSON.stringify({
					channel: msg.channelId,
					message: msg.id,
					user: playerId,
					tournament: participant?.tournamentId,
					...payload
				})
			);
		}
		const who = `<@${playerId}>`; // TODO: username + discriminator should be known when we remove the wrapper
		if (participant.confirmed) {
			if (
				await dropPlayerChallonge(
					participant.tournamentId,
					participant.tournament.privateChannels,
					participant.tournament.status,
					participant.confirmed.challongeId,
					who,
					log,
					this.discord,
					this.website,
					this.database
				)
			) {
				try {
					await this.participantRole.ungrant(playerId, {
						id: participant.tournamentId,
						server: participant.tournament.owningDiscordServer
					});
				} catch (error) {
					logger.warn(error);
					for (const channel of participant.tournament.privateChannels) {
						await this.discord
							.sendMessage(
								channel,
								`Failed to remove **${participant.tournament.name}** participant role from ${who}.`
							)
							.catch(logger.error);
					}
				}
			} else {
				await this.discord.sendDirectMessage(
					playerId,
					`Something went wrong with dropping from **${participant.tournament.name}**. Please try again later or ask your hosts how to proceed.`
				);
				return;
			}
		}
		const confirmed = !!participant.confirmed;
		try {
			await participant.remove();
		} catch (error) {
			logger.error(error);
			for (const channel of participant.tournament.privateChannels) {
				await this.discord
					.sendMessage(
						channel,
						`Failed to drop ${who} from **${participant.tournament.name}** upon request. Please try again later.`
					)
					.catch(logger.error);
			}
			await this.discord
				.sendDirectMessage(
					playerId,
					`Something went wrong with dropping from **${participant.tournament.name}**. Please try again later or ask your hosts how to proceed.`
				)
				.catch(logger.error);
			return;
		}
		log({ event: "success" });
		if (confirmed) {
			for (const channel of participant.tournament.privateChannels) {
				await this.discord
					.sendMessage(channel, `**${participant.tournament.name}** drop: ${who}`)
					.catch(logger.error);
			}
		}
		await this.discord
			.sendDirectMessage(playerId, `You have dropped from **${participant.tournament.name}**.`)
			.catch(logger.error);
	}
}
