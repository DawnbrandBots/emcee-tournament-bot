import { DatabaseTournament, TournamentStatus } from "./database/interface";
import { Participant, RegisterMessage } from "./database/orm";
import { DatabaseWrapperPostgres } from "./database/postgres";
import { DiscordInterface, DiscordMessageIn, DiscordMessageLimited } from "./discord/interface";
import { dropPlayerChallonge } from "./drop";
import { ParticipantRoleProvider } from "./role/participant";
import { Templater } from "./templates";
import { TimeWizard } from "./timer";
import { BlockedDMsError, ChallongeAPIError, TournamentNotFoundError, UserError } from "./util/errors";
import { getLogger } from "./util/logger";
import { Public } from "./util/types";
import { WebsiteInterface, WebsiteTournament } from "./website/interface";

const logger = getLogger("tournament");

export type TournamentInterface = Pick<
	TournamentManager,
	"registerPlayer" | "cleanRegistration" | "createTournament" | "openTournament" | "finishTournament"
>;

export class TournamentManager implements TournamentInterface {
	constructor(
		private discord: DiscordInterface,
		private database: Public<DatabaseWrapperPostgres>,
		private website: WebsiteInterface,
		private templater: Templater,
		private participantRole: ParticipantRoleProvider,
		private timeWizard: TimeWizard
	) {}

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
		await this.database.createTournament(hostId, serverId, web.id, name, desc, topCut);
		return [web.id, web.url, this.templater.format("create", web.id)];
	}

	private async handleDmFailure(playerId: string, tournament: DatabaseTournament): Promise<void> {
		const channels = tournament.privateChannels;
		await Promise.all(
			channels.map(async c => {
				await this.discord.sendMessage(
					c,
					`<@${playerId}> (${this.discord.getUsername(playerId, true)}) is trying to sign up for **${
						tournament.name
					}** (${tournament.id}), but I cannot send them DMs. Please ask them to allow DMs from this server.`
				);
			})
		);
	}

	public async registerPlayer(msg: DiscordMessageIn, playerId: string): Promise<void> {
		const tournaments = await this.database.getPendingTournaments(playerId);
		if (tournaments.length > 0) {
			await this.discord.removeUserReaction(msg.channelId, msg.id, this.CHECK_EMOJI, playerId);
			await this.discord
				.sendDirectMessage(
					playerId,
					`You can only sign up for one tournament at a time! Please either drop from or complete your registration for **${tournaments[0].name}**!`
				)
				.catch(logger.info);
			// TODO: we cannot get the tournament by the current register message to inform the hosts
			return;
		}
		const tournament = await this.database.addPendingPlayer(msg.channelId, msg.id, playerId);
		if (tournament) {
			try {
				await this.discord.sendDirectMessage(
					playerId,
					`You are registering for **${tournament.name}**. ` +
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

	public async finishTournament(tournamentId: string, early = false): Promise<void> {
		const tournament = await this.database.getTournament(tournamentId, TournamentStatus.IPR);
		const channels = tournament.publicChannels;
		let webTourn: WebsiteTournament;
		if (!early) {
			webTourn = await this.website.finishTournament(tournamentId);
		} else {
			// TODO: edit description to say finished?
			webTourn = await this.website.getTournament(tournamentId);
		}
		await this.timeWizard.cancel(tournament.id);

		await this.database.finishTournament(tournamentId);
		const role = this.discord.mentionRole(await this.participantRole.get(tournament));
		await Promise.all(
			channels.map(async c => {
				await this.discord.sendMessage(
					c,
					`${tournament.name} has concluded! Thank you all for playing! ${role}\nResults: ${webTourn.url}`
				);
			})
		);
		await this.participantRole.delete(tournament);
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
					logger.info(error);
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
				for (const channel of participant.tournament.privateChannels) {
					await this.discord
						.sendMessage(
							channel,
							`Something went wrong on Challonge with dropping ${who} from **${participant.tournament.name}** upon request. Please try again later.`
						)
						.catch(logger.error);
				}
				await this.discord
					.sendDirectMessage(
						playerId,
						`Something went wrong with dropping from **${participant.tournament.name}**. Please try again later or ask your hosts how to proceed.`
					)
					.catch(logger.info);
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
				.catch(logger.info);
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
			.catch(logger.info);
	}
}
